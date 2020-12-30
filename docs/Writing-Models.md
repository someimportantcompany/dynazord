# Writing Models

A "model" represents a table in DynamoDB, providing a collection of methods designed to fetch, search, validate & write items following a specific schema. All models returns native JS objects, **there are no documents** as you'd expect from a more traditional ORM.

```js
const dynazord = require('dynazord');
const model = dynazord.createModel({ /* Config */ })
```

This global method is the starting point for all models: It is a synchronous method that builds a model from the provided configuration object that defines the keys, indexes & properties the model will support.

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
- `properties` (**Required**) Object defining each model property. See [Property Types](#property-types) for more details on the types, validators & other options.
- `keySchema` (**Optional**) Object defining the primary index on the DynamoDB table. Defaults to using the first property listed in `properties` as the `hash` key. See [Primary Index](#primary-index) for more details.
- `secondaryIndexes` (**Optional**) Object defining secondary indexes on the DynamoDB table. Defaults to none, as they're also optional in DynamoDB. See [Secondary Indexes](#secondary-indexes) for more details.
- `options` (**Optional**) Object defining individual options with the model. See [Additional Options](#additional-options)

## Primary Index

DynamoDB can be configured to use a single property as the primary key (like your typical database) or it can be used in a typical DynamoDB partition/sort key pattern.

From [Core Components &raquo; Primary Key](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey)

> The partition key of an item is also known as its hash attribute. The term "hash attribute" derives from DynamoDB's usage of an internal hash function to evenly distribute data items across partitions, based on their partition key values.
>
> The sort key of an item is also known as its range attribute. The term "range attribute" derives from the way DynamoDB stores items with the same partition key physically close together, in sorted order by the sort key value.

Set the `KeySchema` the same as you would in your DynamoDB config (either via the console UI or Cloudformation template):

```yml
- Type: AWS::DynamoDB::Table
  Properties:
    TableName: dynazord-example-users
    BillingMode: PAY_PER_REQUEST
    KeySchema:
      - AttributeName: email
        KeyType: HASH
    AttributeDefinitions:
      - AttributeName: email
        AttributeType: S

- Type: AWS::DynamoDB::Table
  Properties:
    TableName: dynazord-example-sessions
    BillingMode: PAY_PER_REQUEST
    KeySchema:
      - AttributeName: email
        KeyType: HASH
      - AttributeName: createdAt
        KeyType: RANGE
    AttributeDefinitions:
      - AttributeName: email
        AttributeType: S
      - AttributeName: createdAt
        AttributeType: N
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
      format: Number,
    },
  },
});
```

<!-- ## Secondary Indexes -->

## Property Types

Keeping it simple, all properties have types & all types have options!

| Type | Native Type | DynamoDB Type |
| ---- |---- | ---- |
| STRING | String | S |
| NUMBER | Number | N |
| BOOLEAN | Boolean | BOOL |
| BINARY | Buffer | B |
| DATE | Date | S/N |

<!-- | ARRAY | Array | L | -->
<!-- | OBJECT | Object | M | -->

```js
const { v4: uuid } = require('uuid');

const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  properties: {
    id: {
      type: String,
      required: true,
      default: () => uuid(),
      validate: {
        notNull: true,
      },
    },
    title: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
    isDraft: {
      type: Boolean,
      default: () => false,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    publishedAt: {
      type: Date,
    },
  },
});
```

### All Types

Regardless of type, all properties have some shared config.

```js
{
  property: {
    /**
     * Specify the type for this property
     * @required
     */
    type: String | Number | Boolean | Date | etc,

    /**
     * Optionally mark this property as "required"
     * @type {Boolean}
     */
    required: true,

    /**
     * Optionally set a relevant default
     * Can be a native tyoe, or a function, or an async-function
     * @type {Function|String|Number|Boolean|Anything}
     */
    default: () => uuid(),

    /**
     * @type {Function}
     * @param value The outgoing value
     * @return The transformed value
     */
    get(value) {
      return value;
    },
    /**
     * @type {Function}
     * @param value The incoming value
     * @return The transformed value
     */
    set(value) {
      // Transform the value as you see fit.
      return value;
    },

    /**
     * Enable/define validators for this property
     * @type {Object}
     */
    validate: {
      /**
       * Types have specific validators, enable them by setting their key to true
       */
      notNull: true,

      /**
       * You can also define your own validators as functions
       * @type {Function}
       */
      isValid(email) {
        return email.includes('@');
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

    /**
     * Specific built-in String validators
     * @type {Object}
     */
    validate: {
      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,
      /**
       * Optionally enforce that the property is not an empty string
       */
      notEmpty: true,
    },
  },
}
```

### Number Type

```js
{
  viewCount: {
    type: Number,

    /**
     * Specific built-in Number validators
     * @type {Object}
     */
    validate: {
      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,
      /**
       * Optionally enforce that the property is greater than 0
       */
      isUnsigned: true,
    },
  },
}
```

- Translates to DynamoDB number (`N`) type.
- Can be referenced as `NUMBER` string or JS's native `Number` constructor.

### Boolean Type

```js
{
  isPublished: {
    type: Boolean,

    /**
     * Specific built-in Boolean validators
     * @type {Object}
     */
    validate: {
      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,
      /**
       * Optionally enforce that the property is greater than 0
       */
      isUnsigned: true,
    },
  },
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

    /**
     * Specific built-in Date validators
     * @type {Object}
     */
    validate: {
      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,
      /**
       * Optionally enforce that the property is greater than 0
       */
      isUnsigned: true,
    },
  },
}
```

- Translates to DynamoDB string (`S`) type or number (`N`) type.
- Can be referenced as `DATE` string or JS's native `Date` constructor.
- Optionally set the underlying DynamoDB format to `Number` when you want to use a date value as a Range key!

### Buffer Type

```js
{
  profileImage: {
    type: Buffer,

    /**
     * Specific built-in Buffer validators
     * @type {Object}
     */
    validate: {
      /**
       * Optionally enforce that the property is not set to NULL
       */
      notNull: true,
    },
  },
}
```

- Translates to DynamoDB binary (`B`) type.
- Can be referenced as `BINARY` string or JS's native `Buffer` constructor.

## Additional Options

## Further Reading

- [Core DynamoDB Concepts](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)

---

Next, [start using models](./Using-Models.md).
