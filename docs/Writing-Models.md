# Writing Models

A "model" represents a table in DynamoDB, providing a collection of methods designed to fetch, search, validate & write items following a specific schema. All models returns native JS objects, **there are no documents** as you'd expect from a more traditional ORM. Create your model with `dynazord.createModel`:

```js
const dynazord = require('dynazord');
const model = dynazord.createModel({
  tableName: /* DYNAMODB TABLE NAME */,
  keySchema: { /* DYNAMODB KEY SCHEMA */ },
  // secondaryIndexes: { /* DYNAMODB KEY SCHEMA */ },
  properties: { /* INDIVIDUAL PROPERTIES FOR YOUR ENTRIES */ },
  hooks: { /* HOOKS FOR YOUR ENTRIES */ },
  options: { /* ADDITIONAL OPTIONS */ },
});
```

| Table of Contents |
| ---- |
| [Primary Index](#primary-index) |
| [Secondary Indexes](#secondary-indexes) |
| [Properties & Types](#properties--types) |
| [Hooks](#hooks) |
| [Additional Options](#additional-options) |
| [Kitchen Sink Example](#kitchen-sink-example) |

The `createModel` method is the starting point for all models: It is a synchronous method that builds a model from the provided configuration object that defines the keys, indexes & properties the model will support.

```js
const users = dynazord.createModel({
  tableName: 'dynazord-example-users',
  properties: {
    email: {
      type: String,
      required: true,
      validate: {
        notNull: true,
      },
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: [ 'ADMIN', 'MODERATOR', 'EDITOR', 'USER' ],
    },
  },
});
```

The `config` object requires & allows the following options:

- `tableName` (**Required**) String setting the table name which will be used to read/write documents from/to.
- `properties` (**Required**) Object defining each model property. See [Property Types](#property--types) for more details on the types, validators & other options.
- `keySchema` (**Optional**) Object defining the primary index on the DynamoDB table. Defaults to using the first property listed in `properties` as the `hash` key. See [Primary Index](#primary-index) for more details.
- `secondaryIndexes` (**Optional**) Object defining secondary indexes on the DynamoDB table. Defaults to none, as they're also optional in DynamoDB. See [Secondary Indexes](#secondary-indexes) for more details.
- `hooks` (**Optional**) Object defining hooks for your entries. Defaults to none. See [Hooks](#hooks) for more details.
- `options` (**Optional**) Object defining individual options with the model. See [Additional Options](#additional-options)

## Primary Index

DynamoDB can be configured to use a single property as the primary key (like your typical database) or it can be used in a typical DynamoDB partition/sort key pattern.

From [Core Components &raquo; Primary Key](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey):

> The partition key of an item is also known as its hash attribute. The term "hash attribute" derives from DynamoDB's usage of an internal hash function to evenly distribute data items across partitions, based on their partition key values.
>
> The sort key of an item is also known as its range attribute. The term "range attribute" derives from the way DynamoDB stores items with the same partition key physically close together, in sorted order by the sort key value.

Set the `KeySchema` the same as you would in your DynamoDB config (either via the console UI or Cloudformation template):

```json
[
  {
    "Type": "AWS::DynamoDB::Table",
    "Properties": {
      "TableName": "dynazord-example-users",
      "BillingMode": "PAY_PER_REQUEST",
      "KeySchema": [
        { "AttributeName": "email", "KeyType": "HASH" }
      ],
      "AttributeDefinitions": [
        { "AttributeName": "email", "AttributeType": "S" }
      ]
    }
  },
  {
    "Type": "AWS::DynamoDB::Table",
    "Properties": {
      "TableName": "dynazord-example-sessions",
      "BillingMode": "PAY_PER_REQUEST",
      "KeySchema": [
        { "AttributeName": "email", "KeyType": "HASH" },
        { "AttributeName": "createdAt", "KeyType": "RANGE" }
      ],
      "AttributeDefinitions": [
        { "AttributeName": "email", "AttributeType": "S" },
        { "AttributeName": "createdAt", "AttributeType": "N" }
      ]
    }
  }
]
```

And configure the `keySchema` to match in your model:

```js
const users = dynazord.createModel({
  tableName: 'dynazord-example-users',

  // In this example, the `email` is the "primary key" so "email" is the hash key
  keySchema: { hash: 'email' },
  // Or you could set the keySchema to a string, since there's only a hash key
  keySchema: 'email',
  // Or you could omit keySchema altogether since email is the first property defined

  properties: {
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
  },
});

const sessions = dynazord.createModel({
  tableName: 'dynazord-example-sessions',

  // In this example, both a hash key & range key are required to match the DynamoDB
  // description, so both must be provided here.
  keySchema: {
    hash: 'email',
    range: 'createdAt',
  },

  properties: {
    email: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      format: Number,
      onUpdate: false,
    },
  },
});
```

- `createModel` will throw an error if the `keySchema` is invalid.
- `createModel` expects hash & range properties to be `required`, although they can have `default` values.

<!-- ## Secondary Indexes -->

## Properties & Types

Each property of a model should have a type, optionally enforced with getters/setters & validators.

| Type | Native Type | DynamoDB Type |
| ---- |---- | ---- |
| [STRING](#string-type) | String | S |
| [NUMBER](#number-type) | Number | N |
| [BOOLEAN](#boolean-type) | Boolean | BOOL |
| [DATE](#date-type) | Date | S/N |
| [BINARY](#binary-type) | Buffer | B |
| [ARRAY](#array-type) | Array | L |
| [OBJECT](#object-type) | Object | M |

Each property should be an object with the following details:

```js
{
  property: {
    /**
     * Specify the type for this property
     * @type {*}
     * @required
     */
    type: String | Number | Boolean | Date | etc,

    /**
     * Optionally mark this property as "required", which will throw errors if the property isn't present.
     *
     * @type {boolean}
     */
    required: true,

    /**
     * Optionally set a relevant default
     * Can be a native type, or a function, or an async-function
     *
     * @type {Function|*}
     * @return {*}
     */
    default: () => uuid(),

    /**
     * Optionally define a function to execute when reading this value from DynamoDB
     *
     * @type {Function}
     * @param {*} value The value from DynamoDB
     * @return {*} The output value going back out to your code
     */
    get(value) {
      return value;
    },
    /**
     * @type {Function}
     * @param {*} value The value from your code
     * @return {*} The input value going into DynamoDB
     */
    set(value) {
      // Transform the value as you see fit.
      return value;
    },

    /**
     * Enable/define validators for this property.
     *
     * @type {Object<string,Function|boolean>}
     */
    validate: {
      /**
       * Types have specific validators, enable them by setting their key to true
       *
       * @type {boolean}
       */
      notNull: true,

      /**
       * You can also define your own validators as functions
       * These can either throw an error (with a custom error message), or return a boolean
       *
       * @type {Function}
       * @param {string} value
       * @return {boolean}
       */
      isValid(value) {
        return `${value}`.includes('@');
      },
    },
  },
}
```

### String Type

```js
{
  email: {
    type: String,
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the property is not an empty string
       */
      notEmpty: true,

    }
  }
}
```

### Number Type

```js
{
  viewCount: {
    type: Number,
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the property is greater than 0
       */
      isUnsigned: true,

    }
  }
}
```

- Translates to DynamoDB number (`N`) type.
- Can be referenced as `NUMBER` string or JS's native `Number` constructor.

### Boolean Type

```js
{
  isPublished: {
    type: Boolean,
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

    }
  }
}
```

- Translates to DynamoDB boolean (`BOOL`) type.
- Can be referenced as `BOOLEAN` string or JS's native `Boolean` constructor.

### Date Type

```js
{
  publishedAt: {
    type: Date,

    /**
     * Optionally set the underlying DynamoDB format, defaults to String
     * @type {Type|String}
     */
    format: String | Number,

    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the date is before a specific point in time
       */
      isBefore: '2022-01-01',
      /**
       * Optionally enforce that the date is after a specific point in time
       */
      isAfter: '2020-01-01',

    }
  }
}
```

- By default translates to DynamoDB string (`S`) type, or set the `format` to `Number` to translate to DynamoDB's number type.
- Can be referenced as `DATE` string or JS's native `Date` constructor.

If you want to store a custom Date format, use a [string type](#string-type) with custom get/set/validate functions:

```js
const formatDate = require('date-fns/format');

{
  publishedDay: {
    type: String,
    set: value => formatDate(value, 'YYYY-MM-DD'),
  }
}
```

You could also just have a custom `get` function to format the date at the last moment:

```js
const formatDate = require('date-fns/format');

{
  publishedDay: {
    type: Date,
    get: value => formatDate(value, 'YYYY-MM-DD'),
  }
}
```

### Binary Type

```js
{
  profileImage: {
    type: Buffer,
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the buffer is not empty
       */
      notEmpty: true,

    }
  }
}
```

- Translates to DynamoDB binary (`B`) type.
- Can be referenced as `BINARY` string or JS's native `Buffer` constructor.

### Array Type

```js
{
  names: {
    type: Array,

    /**
     * Arrays have one property type below them, so you can construct an array of strings, numbers, booleans, object, etc.
     */
    properties: {
      type: String,
      validate: {
        notNull: true,
        notEmpty: true,
      },
    },

    /**
     * And Array types have validators too
     */
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the array has items
       */
      notEmpty: true,

    }
  }
}
```

- Translates to DynamoDB list (`L`) type.
- Can be referenced as `LIST` string or JS's native `Array` constructor.

### Object Type

```js
{
  categories: {
    type: Object,

    /**
     * Objects have one property type below them, so you can construct an array of strings, numbers, booleans, object, etc.
     */
    properties: {
      id: {
        type: String,
        required: true,
        validate: {
          notNull: true,
          notEmpty: true,
        },
      },
      name: {
        type: String,
        required: true,
        validate: {
          notNull: true,
          notEmpty: true,
        },
      },
      color: {
        type: String,
        required: true,
        enum: [ 'RED', 'BLUE', 'GREEN' ],
        validate: {
          notNull: true,
          notEmpty: true,
        },
      },
    },

    /**
     * And Object types have validators too
     */
    validate: {

      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,

      /**
       * Optionally enforce that the object has keys
       */
      notEmpty: true,

    }
  }
}
```

- Translates to DynamoDB map (`M`) type.
- Can be referenced as `MAP` string or JS's native `Object` constructor.
- Omit the object's `properties` descriptor to skip property validation for the nested object.

## Hooks

Often referred to as "lifecycle events", hooks are functions which are called in between core library functions. You can use hooks to perform your own custom validation, for example validating combinations of properties or performing additional/other database lookups.

### Order of operations

```
create
  beforeValidateCreate(create, options)
  beforeValidate(create, options)
  [ validate ]
  afterValidateCreate(create, options) OR validateCreateFailed(create, options)
  afterValidate(create, options) OR validateFailed(create, options)
  beforeCreate(create, options)
  [ formatWriteData ]
  beforeCreateWrite(create, options)
  [ putItem ]
  afterCreateWrite(create, options)
  afterCreate(create, options)

update
  beforeValidateUpdate(update, key, options)
  beforeValidate(update, key, options)
  [ validate ]
  afterValidateUpdate(update, key, options) OR validateUpdateFailed(update, key, options)
  afterValidate(update, key, options) OR validateFailed(update, key, options)
  beforeUpdate(update, key, options)
  [ formatWriteData ]
  beforeUpdateWrite(update, key, options)
  [ putItem ]
  afterUpdateWrite(update, key, options)
  afterUpdate(update, key, options)

delete
  beforeDelete(key, options)
  [ deleteItem ]
  afterDelete(key, options)

upsert
  beforeValidateUpsert(upsert, options)
  beforeValidate(upsert, options)
  [ validate ]
  afterValidateUpsert(upsert, options) OR validateUpsertFailed(upsert, options)
  afterValidate(upsert, options) OR validateFailed(upsert, options)
  beforeUpsert(upsert, options)
  [ formatWriteData ]
  beforeUpsertWrite(upsert, options)
  [ putItem ]
  afterUpsertWrite(upsert, options)
  afterUpsert(upsert, options)

bulkCreate
  beforeBulkCreate(bulk, options)
  beforeValidateCreate(create, options)(*)
  beforeValidate(create, options)(*)
  [ validate ]
  afterValidateCreate(create, options)(*) OR validateCreateFailed(create, options)(*)
  afterValidate(create, options)(*) OR validateFailed(create, options)(*)
  beforeCreate(create, options)(*)
  [ formatWriteData ]
  beforeCreateWrite(create, options)(*)
  [ transactWrite(Put) ]
  afterCreateWrite(create, options)(*)
  afterCreate(create, options)(*)
  afterBulkCreate(bulk, options)

bulkDelete
  beforeBulkDelete(keys, options)
  [ transactWrite(Delete) ]
  afterBulkDelete(keys, options)

(*) Set { hooks: true } to enable per-entry hooks
```

Either declare hooks when you create a model:

```js
const _kebabCase = require('lodash/kebabCase');
const assert = require('http-assert');

const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { hash: 'id' },
  properties: {
    id: {
      type: String,
      required: true,
      default: () => '',
    },
    title: {
      type: String,
    },
  },
  hooks: {
    beforeValidate(entry) {
      if (entry.title) {
        entry.id = _kebabCase(entry.title);
      }
    },
    afterValidate: {
      async uniqueID(entry) {
        if (entry.id) {
          const { id, title } = entry;
          const exists = this.find({ id });
          assert(!exists, 400, new Error(`Expected ID to be unique: ${id}`), { id, title });
        }
      },
    },
  },
});
```

Or add a hook after the model has been created:

```js
entries.hooks.on('beforeValidate', entry => {
  if (entry.title) {
    entry.id = _kebabCase(entry.title);
  }
});
entries.hooks.on('afterValidate', async function uniqueID(entry) {
  // Deliberately not an arrow function so that `this === entries`
  if (entry.id) {
    const { id, title } = entry;
    const exists = this.find({ id });
    assert(!exists, 400, new Error(`Expected ID to be unique: ${id}`), { id, title });
  }
});
```

## Additional Options

Set additional options as the `options` object in the config:

```js
{
  options: {

    /**
     * Enable createdAtTimestamp to add a `createdAt` property to all entries, which will be set on create.
     *
     * @type {boolean}
     */
    createdAtTimestamp: true,

    /**
     * Enable updatedAtTimestamp to add a `updatedAt` property to all entries, which will be set on create/update/upsert.
     *
     * @type {boolean}
     */
    updatedAtTimestamp: true

  }
}
```

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `createdAtTimestamp` | Boolean | `false` | See [Created/Updated Timestamps](#created-updated-timestamps) |
| `updatedAtTimestamp` | Boolean | `false` | See [Created/Updated Timestamps](#created-updated-timestamps) |

### Created/Updated Timestamps

Setting either `createdAtTimestamp` or `updatedAtTimestamp` to `true` will add a `createdAt` or `updatedAt` property respectively:

```js
{
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true
  }
}

{
  createdAt: {
    type: Date,
    required: true,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    required: true,
    default: () => new Date(),
    onUpdate: value => value || new Date(),
  }
}
```

If `createdAtTimestamp` or `updatedAtTimestamp` is set to `true` and you already have `createdAt`/`updatedAt` keys in your `properties` object, they will be merged into the auto-updating definitions that _dynazord_ uses.

A common DynamoDB use-case is to use a hash-key (partition key) & range key (sort key), where you'd like your range key to be the automatically-generated `createdAt`. By default, [the `Date` type](#date-type) stores dates as a string, but to better suit the range key usage you should configure the `createdAt` property to be a number underneath:

```js
const sessions = dynazord.createModel({
  tableName: 'dynazord-example-sessions',
  keySchema: {
    hash: 'email',
    range: 'createdAt',
  },
  properties: {
    email: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date, // All other options get overwritten
      required: true,
      format: Number, // Set this to read/write timestamps as millisecond
    },
  },
  options: {
    createdAtTimestamp: true,
  },
});
```

## Kitchen Sink Example

```js
const dynazord = require('dynazord');
const { v4: uuid } = require('uuid');

const posts = dynazord.createModel({
  tableName: 'dynazord-example-posts',
  keySchema: {
    hash: 'id',
  },
  // secondaryIndexes: {
  //   blogPostsByTime: {
  //     hash: 'blog',
  //     range: 'publishedAt',
  //   },
  // },
  properties: {
    id: {
      type: String,
      required: true,
      default: () => uuid(),
    },
    blog: {
      type: String,
      required: true,
      enum: [ 'jdrydn.com', 'theverge.com' ],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    coverImage: {
      type: Buffer,
    },
    publishedAt: {
      type: Date,
      // Optionally set the underlying format to a Number to assist with sorting
      format: Number,
    },
    status: {
      type: String,
      enum: [ 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'DELETED' ],
      required: true,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});
```

## Further Reading

- [Core DynamoDB Concepts](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)

---

Next, [start using models](./Using-Models.md).
