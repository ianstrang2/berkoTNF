
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model players
 * 
 */
export type players = $Result.DefaultSelection<Prisma.$playersPayload>
/**
 * Model player_matches
 * 
 */
export type player_matches = $Result.DefaultSelection<Prisma.$player_matchesPayload>
/**
 * Model matches
 * 
 */
export type matches = $Result.DefaultSelection<Prisma.$matchesPayload>
/**
 * Model aggregated_recent_performance
 * 
 */
export type aggregated_recent_performance = $Result.DefaultSelection<Prisma.$aggregated_recent_performancePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Players
 * const players = await prisma.players.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Players
   * const players = await prisma.players.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.players`: Exposes CRUD operations for the **players** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Players
    * const players = await prisma.players.findMany()
    * ```
    */
  get players(): Prisma.playersDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.player_matches`: Exposes CRUD operations for the **player_matches** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Player_matches
    * const player_matches = await prisma.player_matches.findMany()
    * ```
    */
  get player_matches(): Prisma.player_matchesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.matches`: Exposes CRUD operations for the **matches** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Matches
    * const matches = await prisma.matches.findMany()
    * ```
    */
  get matches(): Prisma.matchesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aggregated_recent_performance`: Exposes CRUD operations for the **aggregated_recent_performance** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Aggregated_recent_performances
    * const aggregated_recent_performances = await prisma.aggregated_recent_performance.findMany()
    * ```
    */
  get aggregated_recent_performance(): Prisma.aggregated_recent_performanceDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.6.0
   * Query Engine version: 173f8d54f8d52e692c7e27e72a88314ec7aeff60
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    players: 'players',
    player_matches: 'player_matches',
    matches: 'matches',
    aggregated_recent_performance: 'aggregated_recent_performance'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "players" | "player_matches" | "matches" | "aggregated_recent_performance"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      players: {
        payload: Prisma.$playersPayload<ExtArgs>
        fields: Prisma.playersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.playersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.playersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          findFirst: {
            args: Prisma.playersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.playersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          findMany: {
            args: Prisma.playersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>[]
          }
          create: {
            args: Prisma.playersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          createMany: {
            args: Prisma.playersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.playersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>[]
          }
          delete: {
            args: Prisma.playersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          update: {
            args: Prisma.playersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          deleteMany: {
            args: Prisma.playersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.playersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.playersUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>[]
          }
          upsert: {
            args: Prisma.playersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$playersPayload>
          }
          aggregate: {
            args: Prisma.PlayersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlayers>
          }
          groupBy: {
            args: Prisma.playersGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlayersGroupByOutputType>[]
          }
          count: {
            args: Prisma.playersCountArgs<ExtArgs>
            result: $Utils.Optional<PlayersCountAggregateOutputType> | number
          }
        }
      }
      player_matches: {
        payload: Prisma.$player_matchesPayload<ExtArgs>
        fields: Prisma.player_matchesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.player_matchesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.player_matchesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          findFirst: {
            args: Prisma.player_matchesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.player_matchesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          findMany: {
            args: Prisma.player_matchesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>[]
          }
          create: {
            args: Prisma.player_matchesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          createMany: {
            args: Prisma.player_matchesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.player_matchesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>[]
          }
          delete: {
            args: Prisma.player_matchesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          update: {
            args: Prisma.player_matchesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          deleteMany: {
            args: Prisma.player_matchesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.player_matchesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.player_matchesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>[]
          }
          upsert: {
            args: Prisma.player_matchesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$player_matchesPayload>
          }
          aggregate: {
            args: Prisma.Player_matchesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlayer_matches>
          }
          groupBy: {
            args: Prisma.player_matchesGroupByArgs<ExtArgs>
            result: $Utils.Optional<Player_matchesGroupByOutputType>[]
          }
          count: {
            args: Prisma.player_matchesCountArgs<ExtArgs>
            result: $Utils.Optional<Player_matchesCountAggregateOutputType> | number
          }
        }
      }
      matches: {
        payload: Prisma.$matchesPayload<ExtArgs>
        fields: Prisma.matchesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.matchesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.matchesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          findFirst: {
            args: Prisma.matchesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.matchesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          findMany: {
            args: Prisma.matchesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>[]
          }
          create: {
            args: Prisma.matchesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          createMany: {
            args: Prisma.matchesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.matchesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>[]
          }
          delete: {
            args: Prisma.matchesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          update: {
            args: Prisma.matchesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          deleteMany: {
            args: Prisma.matchesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.matchesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.matchesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>[]
          }
          upsert: {
            args: Prisma.matchesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$matchesPayload>
          }
          aggregate: {
            args: Prisma.MatchesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMatches>
          }
          groupBy: {
            args: Prisma.matchesGroupByArgs<ExtArgs>
            result: $Utils.Optional<MatchesGroupByOutputType>[]
          }
          count: {
            args: Prisma.matchesCountArgs<ExtArgs>
            result: $Utils.Optional<MatchesCountAggregateOutputType> | number
          }
        }
      }
      aggregated_recent_performance: {
        payload: Prisma.$aggregated_recent_performancePayload<ExtArgs>
        fields: Prisma.aggregated_recent_performanceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.aggregated_recent_performanceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.aggregated_recent_performanceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          findFirst: {
            args: Prisma.aggregated_recent_performanceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.aggregated_recent_performanceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          findMany: {
            args: Prisma.aggregated_recent_performanceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>[]
          }
          create: {
            args: Prisma.aggregated_recent_performanceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          createMany: {
            args: Prisma.aggregated_recent_performanceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.aggregated_recent_performanceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>[]
          }
          delete: {
            args: Prisma.aggregated_recent_performanceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          update: {
            args: Prisma.aggregated_recent_performanceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          deleteMany: {
            args: Prisma.aggregated_recent_performanceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.aggregated_recent_performanceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.aggregated_recent_performanceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>[]
          }
          upsert: {
            args: Prisma.aggregated_recent_performanceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$aggregated_recent_performancePayload>
          }
          aggregate: {
            args: Prisma.Aggregated_recent_performanceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAggregated_recent_performance>
          }
          groupBy: {
            args: Prisma.aggregated_recent_performanceGroupByArgs<ExtArgs>
            result: $Utils.Optional<Aggregated_recent_performanceGroupByOutputType>[]
          }
          count: {
            args: Prisma.aggregated_recent_performanceCountArgs<ExtArgs>
            result: $Utils.Optional<Aggregated_recent_performanceCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    players?: playersOmit
    player_matches?: player_matchesOmit
    matches?: matchesOmit
    aggregated_recent_performance?: aggregated_recent_performanceOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type MatchesCountOutputType
   */

  export type MatchesCountOutputType = {
    player_matches: number
  }

  export type MatchesCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    player_matches?: boolean | MatchesCountOutputTypeCountPlayer_matchesArgs
  }

  // Custom InputTypes
  /**
   * MatchesCountOutputType without action
   */
  export type MatchesCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MatchesCountOutputType
     */
    select?: MatchesCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MatchesCountOutputType without action
   */
  export type MatchesCountOutputTypeCountPlayer_matchesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: player_matchesWhereInput
  }


  /**
   * Models
   */

  /**
   * Model players
   */

  export type AggregatePlayers = {
    _count: PlayersCountAggregateOutputType | null
    _avg: PlayersAvgAggregateOutputType | null
    _sum: PlayersSumAggregateOutputType | null
    _min: PlayersMinAggregateOutputType | null
    _max: PlayersMaxAggregateOutputType | null
  }

  export type PlayersAvgAggregateOutputType = {
    player_id: number | null
  }

  export type PlayersSumAggregateOutputType = {
    player_id: number | null
  }

  export type PlayersMinAggregateOutputType = {
    player_id: number | null
    is_ringer: boolean | null
    is_retired: boolean | null
  }

  export type PlayersMaxAggregateOutputType = {
    player_id: number | null
    is_ringer: boolean | null
    is_retired: boolean | null
  }

  export type PlayersCountAggregateOutputType = {
    player_id: number
    is_ringer: number
    is_retired: number
    _all: number
  }


  export type PlayersAvgAggregateInputType = {
    player_id?: true
  }

  export type PlayersSumAggregateInputType = {
    player_id?: true
  }

  export type PlayersMinAggregateInputType = {
    player_id?: true
    is_ringer?: true
    is_retired?: true
  }

  export type PlayersMaxAggregateInputType = {
    player_id?: true
    is_ringer?: true
    is_retired?: true
  }

  export type PlayersCountAggregateInputType = {
    player_id?: true
    is_ringer?: true
    is_retired?: true
    _all?: true
  }

  export type PlayersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which players to aggregate.
     */
    where?: playersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of players to fetch.
     */
    orderBy?: playersOrderByWithRelationInput | playersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: playersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` players from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` players.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned players
    **/
    _count?: true | PlayersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlayersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlayersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlayersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlayersMaxAggregateInputType
  }

  export type GetPlayersAggregateType<T extends PlayersAggregateArgs> = {
        [P in keyof T & keyof AggregatePlayers]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlayers[P]>
      : GetScalarType<T[P], AggregatePlayers[P]>
  }




  export type playersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: playersWhereInput
    orderBy?: playersOrderByWithAggregationInput | playersOrderByWithAggregationInput[]
    by: PlayersScalarFieldEnum[] | PlayersScalarFieldEnum
    having?: playersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlayersCountAggregateInputType | true
    _avg?: PlayersAvgAggregateInputType
    _sum?: PlayersSumAggregateInputType
    _min?: PlayersMinAggregateInputType
    _max?: PlayersMaxAggregateInputType
  }

  export type PlayersGroupByOutputType = {
    player_id: number
    is_ringer: boolean
    is_retired: boolean
    _count: PlayersCountAggregateOutputType | null
    _avg: PlayersAvgAggregateOutputType | null
    _sum: PlayersSumAggregateOutputType | null
    _min: PlayersMinAggregateOutputType | null
    _max: PlayersMaxAggregateOutputType | null
  }

  type GetPlayersGroupByPayload<T extends playersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlayersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlayersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlayersGroupByOutputType[P]>
            : GetScalarType<T[P], PlayersGroupByOutputType[P]>
        }
      >
    >


  export type playersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    player_id?: boolean
    is_ringer?: boolean
    is_retired?: boolean
  }, ExtArgs["result"]["players"]>

  export type playersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    player_id?: boolean
    is_ringer?: boolean
    is_retired?: boolean
  }, ExtArgs["result"]["players"]>

  export type playersSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    player_id?: boolean
    is_ringer?: boolean
    is_retired?: boolean
  }, ExtArgs["result"]["players"]>

  export type playersSelectScalar = {
    player_id?: boolean
    is_ringer?: boolean
    is_retired?: boolean
  }

  export type playersOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"player_id" | "is_ringer" | "is_retired", ExtArgs["result"]["players"]>

  export type $playersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "players"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      player_id: number
      is_ringer: boolean
      is_retired: boolean
    }, ExtArgs["result"]["players"]>
    composites: {}
  }

  type playersGetPayload<S extends boolean | null | undefined | playersDefaultArgs> = $Result.GetResult<Prisma.$playersPayload, S>

  type playersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<playersFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlayersCountAggregateInputType | true
    }

  export interface playersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['players'], meta: { name: 'players' } }
    /**
     * Find zero or one Players that matches the filter.
     * @param {playersFindUniqueArgs} args - Arguments to find a Players
     * @example
     * // Get one Players
     * const players = await prisma.players.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends playersFindUniqueArgs>(args: SelectSubset<T, playersFindUniqueArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Players that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {playersFindUniqueOrThrowArgs} args - Arguments to find a Players
     * @example
     * // Get one Players
     * const players = await prisma.players.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends playersFindUniqueOrThrowArgs>(args: SelectSubset<T, playersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Players that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersFindFirstArgs} args - Arguments to find a Players
     * @example
     * // Get one Players
     * const players = await prisma.players.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends playersFindFirstArgs>(args?: SelectSubset<T, playersFindFirstArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Players that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersFindFirstOrThrowArgs} args - Arguments to find a Players
     * @example
     * // Get one Players
     * const players = await prisma.players.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends playersFindFirstOrThrowArgs>(args?: SelectSubset<T, playersFindFirstOrThrowArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Players that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Players
     * const players = await prisma.players.findMany()
     * 
     * // Get first 10 Players
     * const players = await prisma.players.findMany({ take: 10 })
     * 
     * // Only select the `player_id`
     * const playersWithPlayer_idOnly = await prisma.players.findMany({ select: { player_id: true } })
     * 
     */
    findMany<T extends playersFindManyArgs>(args?: SelectSubset<T, playersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Players.
     * @param {playersCreateArgs} args - Arguments to create a Players.
     * @example
     * // Create one Players
     * const Players = await prisma.players.create({
     *   data: {
     *     // ... data to create a Players
     *   }
     * })
     * 
     */
    create<T extends playersCreateArgs>(args: SelectSubset<T, playersCreateArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Players.
     * @param {playersCreateManyArgs} args - Arguments to create many Players.
     * @example
     * // Create many Players
     * const players = await prisma.players.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends playersCreateManyArgs>(args?: SelectSubset<T, playersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Players and returns the data saved in the database.
     * @param {playersCreateManyAndReturnArgs} args - Arguments to create many Players.
     * @example
     * // Create many Players
     * const players = await prisma.players.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Players and only return the `player_id`
     * const playersWithPlayer_idOnly = await prisma.players.createManyAndReturn({
     *   select: { player_id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends playersCreateManyAndReturnArgs>(args?: SelectSubset<T, playersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Players.
     * @param {playersDeleteArgs} args - Arguments to delete one Players.
     * @example
     * // Delete one Players
     * const Players = await prisma.players.delete({
     *   where: {
     *     // ... filter to delete one Players
     *   }
     * })
     * 
     */
    delete<T extends playersDeleteArgs>(args: SelectSubset<T, playersDeleteArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Players.
     * @param {playersUpdateArgs} args - Arguments to update one Players.
     * @example
     * // Update one Players
     * const players = await prisma.players.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends playersUpdateArgs>(args: SelectSubset<T, playersUpdateArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Players.
     * @param {playersDeleteManyArgs} args - Arguments to filter Players to delete.
     * @example
     * // Delete a few Players
     * const { count } = await prisma.players.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends playersDeleteManyArgs>(args?: SelectSubset<T, playersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Players.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Players
     * const players = await prisma.players.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends playersUpdateManyArgs>(args: SelectSubset<T, playersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Players and returns the data updated in the database.
     * @param {playersUpdateManyAndReturnArgs} args - Arguments to update many Players.
     * @example
     * // Update many Players
     * const players = await prisma.players.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Players and only return the `player_id`
     * const playersWithPlayer_idOnly = await prisma.players.updateManyAndReturn({
     *   select: { player_id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends playersUpdateManyAndReturnArgs>(args: SelectSubset<T, playersUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Players.
     * @param {playersUpsertArgs} args - Arguments to update or create a Players.
     * @example
     * // Update or create a Players
     * const players = await prisma.players.upsert({
     *   create: {
     *     // ... data to create a Players
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Players we want to update
     *   }
     * })
     */
    upsert<T extends playersUpsertArgs>(args: SelectSubset<T, playersUpsertArgs<ExtArgs>>): Prisma__playersClient<$Result.GetResult<Prisma.$playersPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Players.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersCountArgs} args - Arguments to filter Players to count.
     * @example
     * // Count the number of Players
     * const count = await prisma.players.count({
     *   where: {
     *     // ... the filter for the Players we want to count
     *   }
     * })
    **/
    count<T extends playersCountArgs>(
      args?: Subset<T, playersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlayersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Players.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlayersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlayersAggregateArgs>(args: Subset<T, PlayersAggregateArgs>): Prisma.PrismaPromise<GetPlayersAggregateType<T>>

    /**
     * Group by Players.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {playersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends playersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: playersGroupByArgs['orderBy'] }
        : { orderBy?: playersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, playersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlayersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the players model
   */
  readonly fields: playersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for players.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__playersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the players model
   */
  interface playersFieldRefs {
    readonly player_id: FieldRef<"players", 'Int'>
    readonly is_ringer: FieldRef<"players", 'Boolean'>
    readonly is_retired: FieldRef<"players", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * players findUnique
   */
  export type playersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter, which players to fetch.
     */
    where: playersWhereUniqueInput
  }

  /**
   * players findUniqueOrThrow
   */
  export type playersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter, which players to fetch.
     */
    where: playersWhereUniqueInput
  }

  /**
   * players findFirst
   */
  export type playersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter, which players to fetch.
     */
    where?: playersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of players to fetch.
     */
    orderBy?: playersOrderByWithRelationInput | playersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for players.
     */
    cursor?: playersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` players from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` players.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of players.
     */
    distinct?: PlayersScalarFieldEnum | PlayersScalarFieldEnum[]
  }

  /**
   * players findFirstOrThrow
   */
  export type playersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter, which players to fetch.
     */
    where?: playersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of players to fetch.
     */
    orderBy?: playersOrderByWithRelationInput | playersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for players.
     */
    cursor?: playersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` players from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` players.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of players.
     */
    distinct?: PlayersScalarFieldEnum | PlayersScalarFieldEnum[]
  }

  /**
   * players findMany
   */
  export type playersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter, which players to fetch.
     */
    where?: playersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of players to fetch.
     */
    orderBy?: playersOrderByWithRelationInput | playersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing players.
     */
    cursor?: playersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` players from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` players.
     */
    skip?: number
    distinct?: PlayersScalarFieldEnum | PlayersScalarFieldEnum[]
  }

  /**
   * players create
   */
  export type playersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * The data needed to create a players.
     */
    data: XOR<playersCreateInput, playersUncheckedCreateInput>
  }

  /**
   * players createMany
   */
  export type playersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many players.
     */
    data: playersCreateManyInput | playersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * players createManyAndReturn
   */
  export type playersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * The data used to create many players.
     */
    data: playersCreateManyInput | playersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * players update
   */
  export type playersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * The data needed to update a players.
     */
    data: XOR<playersUpdateInput, playersUncheckedUpdateInput>
    /**
     * Choose, which players to update.
     */
    where: playersWhereUniqueInput
  }

  /**
   * players updateMany
   */
  export type playersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update players.
     */
    data: XOR<playersUpdateManyMutationInput, playersUncheckedUpdateManyInput>
    /**
     * Filter which players to update
     */
    where?: playersWhereInput
    /**
     * Limit how many players to update.
     */
    limit?: number
  }

  /**
   * players updateManyAndReturn
   */
  export type playersUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * The data used to update players.
     */
    data: XOR<playersUpdateManyMutationInput, playersUncheckedUpdateManyInput>
    /**
     * Filter which players to update
     */
    where?: playersWhereInput
    /**
     * Limit how many players to update.
     */
    limit?: number
  }

  /**
   * players upsert
   */
  export type playersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * The filter to search for the players to update in case it exists.
     */
    where: playersWhereUniqueInput
    /**
     * In case the players found by the `where` argument doesn't exist, create a new players with this data.
     */
    create: XOR<playersCreateInput, playersUncheckedCreateInput>
    /**
     * In case the players was found with the provided `where` argument, update it with this data.
     */
    update: XOR<playersUpdateInput, playersUncheckedUpdateInput>
  }

  /**
   * players delete
   */
  export type playersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
    /**
     * Filter which players to delete.
     */
    where: playersWhereUniqueInput
  }

  /**
   * players deleteMany
   */
  export type playersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which players to delete
     */
    where?: playersWhereInput
    /**
     * Limit how many players to delete.
     */
    limit?: number
  }

  /**
   * players without action
   */
  export type playersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the players
     */
    select?: playersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the players
     */
    omit?: playersOmit<ExtArgs> | null
  }


  /**
   * Model player_matches
   */

  export type AggregatePlayer_matches = {
    _count: Player_matchesCountAggregateOutputType | null
    _avg: Player_matchesAvgAggregateOutputType | null
    _sum: Player_matchesSumAggregateOutputType | null
    _min: Player_matchesMinAggregateOutputType | null
    _max: Player_matchesMaxAggregateOutputType | null
  }

  export type Player_matchesAvgAggregateOutputType = {
    id: number | null
    player_id: number | null
    goals: number | null
    match_id: number | null
  }

  export type Player_matchesSumAggregateOutputType = {
    id: number | null
    player_id: number | null
    goals: number | null
    match_id: number | null
  }

  export type Player_matchesMinAggregateOutputType = {
    id: number | null
    player_id: number | null
    team: string | null
    goals: number | null
    result: string | null
    heavy_win: boolean | null
    heavy_loss: boolean | null
    match_id: number | null
  }

  export type Player_matchesMaxAggregateOutputType = {
    id: number | null
    player_id: number | null
    team: string | null
    goals: number | null
    result: string | null
    heavy_win: boolean | null
    heavy_loss: boolean | null
    match_id: number | null
  }

  export type Player_matchesCountAggregateOutputType = {
    id: number
    player_id: number
    team: number
    goals: number
    result: number
    heavy_win: number
    heavy_loss: number
    match_id: number
    _all: number
  }


  export type Player_matchesAvgAggregateInputType = {
    id?: true
    player_id?: true
    goals?: true
    match_id?: true
  }

  export type Player_matchesSumAggregateInputType = {
    id?: true
    player_id?: true
    goals?: true
    match_id?: true
  }

  export type Player_matchesMinAggregateInputType = {
    id?: true
    player_id?: true
    team?: true
    goals?: true
    result?: true
    heavy_win?: true
    heavy_loss?: true
    match_id?: true
  }

  export type Player_matchesMaxAggregateInputType = {
    id?: true
    player_id?: true
    team?: true
    goals?: true
    result?: true
    heavy_win?: true
    heavy_loss?: true
    match_id?: true
  }

  export type Player_matchesCountAggregateInputType = {
    id?: true
    player_id?: true
    team?: true
    goals?: true
    result?: true
    heavy_win?: true
    heavy_loss?: true
    match_id?: true
    _all?: true
  }

  export type Player_matchesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which player_matches to aggregate.
     */
    where?: player_matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of player_matches to fetch.
     */
    orderBy?: player_matchesOrderByWithRelationInput | player_matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: player_matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` player_matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` player_matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned player_matches
    **/
    _count?: true | Player_matchesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Player_matchesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Player_matchesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Player_matchesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Player_matchesMaxAggregateInputType
  }

  export type GetPlayer_matchesAggregateType<T extends Player_matchesAggregateArgs> = {
        [P in keyof T & keyof AggregatePlayer_matches]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlayer_matches[P]>
      : GetScalarType<T[P], AggregatePlayer_matches[P]>
  }




  export type player_matchesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: player_matchesWhereInput
    orderBy?: player_matchesOrderByWithAggregationInput | player_matchesOrderByWithAggregationInput[]
    by: Player_matchesScalarFieldEnum[] | Player_matchesScalarFieldEnum
    having?: player_matchesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Player_matchesCountAggregateInputType | true
    _avg?: Player_matchesAvgAggregateInputType
    _sum?: Player_matchesSumAggregateInputType
    _min?: Player_matchesMinAggregateInputType
    _max?: Player_matchesMaxAggregateInputType
  }

  export type Player_matchesGroupByOutputType = {
    id: number
    player_id: number
    team: string | null
    goals: number | null
    result: string | null
    heavy_win: boolean | null
    heavy_loss: boolean | null
    match_id: number | null
    _count: Player_matchesCountAggregateOutputType | null
    _avg: Player_matchesAvgAggregateOutputType | null
    _sum: Player_matchesSumAggregateOutputType | null
    _min: Player_matchesMinAggregateOutputType | null
    _max: Player_matchesMaxAggregateOutputType | null
  }

  type GetPlayer_matchesGroupByPayload<T extends player_matchesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Player_matchesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Player_matchesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Player_matchesGroupByOutputType[P]>
            : GetScalarType<T[P], Player_matchesGroupByOutputType[P]>
        }
      >
    >


  export type player_matchesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    team?: boolean
    goals?: boolean
    result?: boolean
    heavy_win?: boolean
    heavy_loss?: boolean
    match_id?: boolean
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }, ExtArgs["result"]["player_matches"]>

  export type player_matchesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    team?: boolean
    goals?: boolean
    result?: boolean
    heavy_win?: boolean
    heavy_loss?: boolean
    match_id?: boolean
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }, ExtArgs["result"]["player_matches"]>

  export type player_matchesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    team?: boolean
    goals?: boolean
    result?: boolean
    heavy_win?: boolean
    heavy_loss?: boolean
    match_id?: boolean
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }, ExtArgs["result"]["player_matches"]>

  export type player_matchesSelectScalar = {
    id?: boolean
    player_id?: boolean
    team?: boolean
    goals?: boolean
    result?: boolean
    heavy_win?: boolean
    heavy_loss?: boolean
    match_id?: boolean
  }

  export type player_matchesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "player_id" | "team" | "goals" | "result" | "heavy_win" | "heavy_loss" | "match_id", ExtArgs["result"]["player_matches"]>
  export type player_matchesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }
  export type player_matchesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }
  export type player_matchesIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    matches?: boolean | player_matches$matchesArgs<ExtArgs>
  }

  export type $player_matchesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "player_matches"
    objects: {
      matches: Prisma.$matchesPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      player_id: number
      team: string | null
      goals: number | null
      result: string | null
      heavy_win: boolean | null
      heavy_loss: boolean | null
      match_id: number | null
    }, ExtArgs["result"]["player_matches"]>
    composites: {}
  }

  type player_matchesGetPayload<S extends boolean | null | undefined | player_matchesDefaultArgs> = $Result.GetResult<Prisma.$player_matchesPayload, S>

  type player_matchesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<player_matchesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Player_matchesCountAggregateInputType | true
    }

  export interface player_matchesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['player_matches'], meta: { name: 'player_matches' } }
    /**
     * Find zero or one Player_matches that matches the filter.
     * @param {player_matchesFindUniqueArgs} args - Arguments to find a Player_matches
     * @example
     * // Get one Player_matches
     * const player_matches = await prisma.player_matches.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends player_matchesFindUniqueArgs>(args: SelectSubset<T, player_matchesFindUniqueArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Player_matches that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {player_matchesFindUniqueOrThrowArgs} args - Arguments to find a Player_matches
     * @example
     * // Get one Player_matches
     * const player_matches = await prisma.player_matches.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends player_matchesFindUniqueOrThrowArgs>(args: SelectSubset<T, player_matchesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Player_matches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesFindFirstArgs} args - Arguments to find a Player_matches
     * @example
     * // Get one Player_matches
     * const player_matches = await prisma.player_matches.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends player_matchesFindFirstArgs>(args?: SelectSubset<T, player_matchesFindFirstArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Player_matches that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesFindFirstOrThrowArgs} args - Arguments to find a Player_matches
     * @example
     * // Get one Player_matches
     * const player_matches = await prisma.player_matches.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends player_matchesFindFirstOrThrowArgs>(args?: SelectSubset<T, player_matchesFindFirstOrThrowArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Player_matches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Player_matches
     * const player_matches = await prisma.player_matches.findMany()
     * 
     * // Get first 10 Player_matches
     * const player_matches = await prisma.player_matches.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const player_matchesWithIdOnly = await prisma.player_matches.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends player_matchesFindManyArgs>(args?: SelectSubset<T, player_matchesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Player_matches.
     * @param {player_matchesCreateArgs} args - Arguments to create a Player_matches.
     * @example
     * // Create one Player_matches
     * const Player_matches = await prisma.player_matches.create({
     *   data: {
     *     // ... data to create a Player_matches
     *   }
     * })
     * 
     */
    create<T extends player_matchesCreateArgs>(args: SelectSubset<T, player_matchesCreateArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Player_matches.
     * @param {player_matchesCreateManyArgs} args - Arguments to create many Player_matches.
     * @example
     * // Create many Player_matches
     * const player_matches = await prisma.player_matches.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends player_matchesCreateManyArgs>(args?: SelectSubset<T, player_matchesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Player_matches and returns the data saved in the database.
     * @param {player_matchesCreateManyAndReturnArgs} args - Arguments to create many Player_matches.
     * @example
     * // Create many Player_matches
     * const player_matches = await prisma.player_matches.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Player_matches and only return the `id`
     * const player_matchesWithIdOnly = await prisma.player_matches.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends player_matchesCreateManyAndReturnArgs>(args?: SelectSubset<T, player_matchesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Player_matches.
     * @param {player_matchesDeleteArgs} args - Arguments to delete one Player_matches.
     * @example
     * // Delete one Player_matches
     * const Player_matches = await prisma.player_matches.delete({
     *   where: {
     *     // ... filter to delete one Player_matches
     *   }
     * })
     * 
     */
    delete<T extends player_matchesDeleteArgs>(args: SelectSubset<T, player_matchesDeleteArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Player_matches.
     * @param {player_matchesUpdateArgs} args - Arguments to update one Player_matches.
     * @example
     * // Update one Player_matches
     * const player_matches = await prisma.player_matches.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends player_matchesUpdateArgs>(args: SelectSubset<T, player_matchesUpdateArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Player_matches.
     * @param {player_matchesDeleteManyArgs} args - Arguments to filter Player_matches to delete.
     * @example
     * // Delete a few Player_matches
     * const { count } = await prisma.player_matches.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends player_matchesDeleteManyArgs>(args?: SelectSubset<T, player_matchesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Player_matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Player_matches
     * const player_matches = await prisma.player_matches.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends player_matchesUpdateManyArgs>(args: SelectSubset<T, player_matchesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Player_matches and returns the data updated in the database.
     * @param {player_matchesUpdateManyAndReturnArgs} args - Arguments to update many Player_matches.
     * @example
     * // Update many Player_matches
     * const player_matches = await prisma.player_matches.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Player_matches and only return the `id`
     * const player_matchesWithIdOnly = await prisma.player_matches.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends player_matchesUpdateManyAndReturnArgs>(args: SelectSubset<T, player_matchesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Player_matches.
     * @param {player_matchesUpsertArgs} args - Arguments to update or create a Player_matches.
     * @example
     * // Update or create a Player_matches
     * const player_matches = await prisma.player_matches.upsert({
     *   create: {
     *     // ... data to create a Player_matches
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Player_matches we want to update
     *   }
     * })
     */
    upsert<T extends player_matchesUpsertArgs>(args: SelectSubset<T, player_matchesUpsertArgs<ExtArgs>>): Prisma__player_matchesClient<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Player_matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesCountArgs} args - Arguments to filter Player_matches to count.
     * @example
     * // Count the number of Player_matches
     * const count = await prisma.player_matches.count({
     *   where: {
     *     // ... the filter for the Player_matches we want to count
     *   }
     * })
    **/
    count<T extends player_matchesCountArgs>(
      args?: Subset<T, player_matchesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Player_matchesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Player_matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Player_matchesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Player_matchesAggregateArgs>(args: Subset<T, Player_matchesAggregateArgs>): Prisma.PrismaPromise<GetPlayer_matchesAggregateType<T>>

    /**
     * Group by Player_matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {player_matchesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends player_matchesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: player_matchesGroupByArgs['orderBy'] }
        : { orderBy?: player_matchesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, player_matchesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlayer_matchesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the player_matches model
   */
  readonly fields: player_matchesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for player_matches.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__player_matchesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    matches<T extends player_matches$matchesArgs<ExtArgs> = {}>(args?: Subset<T, player_matches$matchesArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the player_matches model
   */
  interface player_matchesFieldRefs {
    readonly id: FieldRef<"player_matches", 'Int'>
    readonly player_id: FieldRef<"player_matches", 'Int'>
    readonly team: FieldRef<"player_matches", 'String'>
    readonly goals: FieldRef<"player_matches", 'Int'>
    readonly result: FieldRef<"player_matches", 'String'>
    readonly heavy_win: FieldRef<"player_matches", 'Boolean'>
    readonly heavy_loss: FieldRef<"player_matches", 'Boolean'>
    readonly match_id: FieldRef<"player_matches", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * player_matches findUnique
   */
  export type player_matchesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter, which player_matches to fetch.
     */
    where: player_matchesWhereUniqueInput
  }

  /**
   * player_matches findUniqueOrThrow
   */
  export type player_matchesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter, which player_matches to fetch.
     */
    where: player_matchesWhereUniqueInput
  }

  /**
   * player_matches findFirst
   */
  export type player_matchesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter, which player_matches to fetch.
     */
    where?: player_matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of player_matches to fetch.
     */
    orderBy?: player_matchesOrderByWithRelationInput | player_matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for player_matches.
     */
    cursor?: player_matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` player_matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` player_matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of player_matches.
     */
    distinct?: Player_matchesScalarFieldEnum | Player_matchesScalarFieldEnum[]
  }

  /**
   * player_matches findFirstOrThrow
   */
  export type player_matchesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter, which player_matches to fetch.
     */
    where?: player_matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of player_matches to fetch.
     */
    orderBy?: player_matchesOrderByWithRelationInput | player_matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for player_matches.
     */
    cursor?: player_matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` player_matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` player_matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of player_matches.
     */
    distinct?: Player_matchesScalarFieldEnum | Player_matchesScalarFieldEnum[]
  }

  /**
   * player_matches findMany
   */
  export type player_matchesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter, which player_matches to fetch.
     */
    where?: player_matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of player_matches to fetch.
     */
    orderBy?: player_matchesOrderByWithRelationInput | player_matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing player_matches.
     */
    cursor?: player_matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` player_matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` player_matches.
     */
    skip?: number
    distinct?: Player_matchesScalarFieldEnum | Player_matchesScalarFieldEnum[]
  }

  /**
   * player_matches create
   */
  export type player_matchesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * The data needed to create a player_matches.
     */
    data: XOR<player_matchesCreateInput, player_matchesUncheckedCreateInput>
  }

  /**
   * player_matches createMany
   */
  export type player_matchesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many player_matches.
     */
    data: player_matchesCreateManyInput | player_matchesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * player_matches createManyAndReturn
   */
  export type player_matchesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * The data used to create many player_matches.
     */
    data: player_matchesCreateManyInput | player_matchesCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * player_matches update
   */
  export type player_matchesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * The data needed to update a player_matches.
     */
    data: XOR<player_matchesUpdateInput, player_matchesUncheckedUpdateInput>
    /**
     * Choose, which player_matches to update.
     */
    where: player_matchesWhereUniqueInput
  }

  /**
   * player_matches updateMany
   */
  export type player_matchesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update player_matches.
     */
    data: XOR<player_matchesUpdateManyMutationInput, player_matchesUncheckedUpdateManyInput>
    /**
     * Filter which player_matches to update
     */
    where?: player_matchesWhereInput
    /**
     * Limit how many player_matches to update.
     */
    limit?: number
  }

  /**
   * player_matches updateManyAndReturn
   */
  export type player_matchesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * The data used to update player_matches.
     */
    data: XOR<player_matchesUpdateManyMutationInput, player_matchesUncheckedUpdateManyInput>
    /**
     * Filter which player_matches to update
     */
    where?: player_matchesWhereInput
    /**
     * Limit how many player_matches to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * player_matches upsert
   */
  export type player_matchesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * The filter to search for the player_matches to update in case it exists.
     */
    where: player_matchesWhereUniqueInput
    /**
     * In case the player_matches found by the `where` argument doesn't exist, create a new player_matches with this data.
     */
    create: XOR<player_matchesCreateInput, player_matchesUncheckedCreateInput>
    /**
     * In case the player_matches was found with the provided `where` argument, update it with this data.
     */
    update: XOR<player_matchesUpdateInput, player_matchesUncheckedUpdateInput>
  }

  /**
   * player_matches delete
   */
  export type player_matchesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    /**
     * Filter which player_matches to delete.
     */
    where: player_matchesWhereUniqueInput
  }

  /**
   * player_matches deleteMany
   */
  export type player_matchesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which player_matches to delete
     */
    where?: player_matchesWhereInput
    /**
     * Limit how many player_matches to delete.
     */
    limit?: number
  }

  /**
   * player_matches.matches
   */
  export type player_matches$matchesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    where?: matchesWhereInput
  }

  /**
   * player_matches without action
   */
  export type player_matchesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
  }


  /**
   * Model matches
   */

  export type AggregateMatches = {
    _count: MatchesCountAggregateOutputType | null
    _avg: MatchesAvgAggregateOutputType | null
    _sum: MatchesSumAggregateOutputType | null
    _min: MatchesMinAggregateOutputType | null
    _max: MatchesMaxAggregateOutputType | null
  }

  export type MatchesAvgAggregateOutputType = {
    id: number | null
    team_a_score: number | null
    team_b_score: number | null
  }

  export type MatchesSumAggregateOutputType = {
    id: number | null
    team_a_score: number | null
    team_b_score: number | null
  }

  export type MatchesMinAggregateOutputType = {
    id: number | null
    match_date: Date | null
    team_a_score: number | null
    team_b_score: number | null
  }

  export type MatchesMaxAggregateOutputType = {
    id: number | null
    match_date: Date | null
    team_a_score: number | null
    team_b_score: number | null
  }

  export type MatchesCountAggregateOutputType = {
    id: number
    match_date: number
    team_a_score: number
    team_b_score: number
    _all: number
  }


  export type MatchesAvgAggregateInputType = {
    id?: true
    team_a_score?: true
    team_b_score?: true
  }

  export type MatchesSumAggregateInputType = {
    id?: true
    team_a_score?: true
    team_b_score?: true
  }

  export type MatchesMinAggregateInputType = {
    id?: true
    match_date?: true
    team_a_score?: true
    team_b_score?: true
  }

  export type MatchesMaxAggregateInputType = {
    id?: true
    match_date?: true
    team_a_score?: true
    team_b_score?: true
  }

  export type MatchesCountAggregateInputType = {
    id?: true
    match_date?: true
    team_a_score?: true
    team_b_score?: true
    _all?: true
  }

  export type MatchesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which matches to aggregate.
     */
    where?: matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of matches to fetch.
     */
    orderBy?: matchesOrderByWithRelationInput | matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned matches
    **/
    _count?: true | MatchesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MatchesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MatchesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MatchesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MatchesMaxAggregateInputType
  }

  export type GetMatchesAggregateType<T extends MatchesAggregateArgs> = {
        [P in keyof T & keyof AggregateMatches]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMatches[P]>
      : GetScalarType<T[P], AggregateMatches[P]>
  }




  export type matchesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: matchesWhereInput
    orderBy?: matchesOrderByWithAggregationInput | matchesOrderByWithAggregationInput[]
    by: MatchesScalarFieldEnum[] | MatchesScalarFieldEnum
    having?: matchesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MatchesCountAggregateInputType | true
    _avg?: MatchesAvgAggregateInputType
    _sum?: MatchesSumAggregateInputType
    _min?: MatchesMinAggregateInputType
    _max?: MatchesMaxAggregateInputType
  }

  export type MatchesGroupByOutputType = {
    id: number
    match_date: Date
    team_a_score: number
    team_b_score: number
    _count: MatchesCountAggregateOutputType | null
    _avg: MatchesAvgAggregateOutputType | null
    _sum: MatchesSumAggregateOutputType | null
    _min: MatchesMinAggregateOutputType | null
    _max: MatchesMaxAggregateOutputType | null
  }

  type GetMatchesGroupByPayload<T extends matchesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MatchesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MatchesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MatchesGroupByOutputType[P]>
            : GetScalarType<T[P], MatchesGroupByOutputType[P]>
        }
      >
    >


  export type matchesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    match_date?: boolean
    team_a_score?: boolean
    team_b_score?: boolean
    player_matches?: boolean | matches$player_matchesArgs<ExtArgs>
    _count?: boolean | MatchesCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["matches"]>

  export type matchesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    match_date?: boolean
    team_a_score?: boolean
    team_b_score?: boolean
  }, ExtArgs["result"]["matches"]>

  export type matchesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    match_date?: boolean
    team_a_score?: boolean
    team_b_score?: boolean
  }, ExtArgs["result"]["matches"]>

  export type matchesSelectScalar = {
    id?: boolean
    match_date?: boolean
    team_a_score?: boolean
    team_b_score?: boolean
  }

  export type matchesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "match_date" | "team_a_score" | "team_b_score", ExtArgs["result"]["matches"]>
  export type matchesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    player_matches?: boolean | matches$player_matchesArgs<ExtArgs>
    _count?: boolean | MatchesCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type matchesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type matchesIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $matchesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "matches"
    objects: {
      player_matches: Prisma.$player_matchesPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      match_date: Date
      team_a_score: number
      team_b_score: number
    }, ExtArgs["result"]["matches"]>
    composites: {}
  }

  type matchesGetPayload<S extends boolean | null | undefined | matchesDefaultArgs> = $Result.GetResult<Prisma.$matchesPayload, S>

  type matchesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<matchesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MatchesCountAggregateInputType | true
    }

  export interface matchesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['matches'], meta: { name: 'matches' } }
    /**
     * Find zero or one Matches that matches the filter.
     * @param {matchesFindUniqueArgs} args - Arguments to find a Matches
     * @example
     * // Get one Matches
     * const matches = await prisma.matches.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends matchesFindUniqueArgs>(args: SelectSubset<T, matchesFindUniqueArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Matches that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {matchesFindUniqueOrThrowArgs} args - Arguments to find a Matches
     * @example
     * // Get one Matches
     * const matches = await prisma.matches.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends matchesFindUniqueOrThrowArgs>(args: SelectSubset<T, matchesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Matches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesFindFirstArgs} args - Arguments to find a Matches
     * @example
     * // Get one Matches
     * const matches = await prisma.matches.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends matchesFindFirstArgs>(args?: SelectSubset<T, matchesFindFirstArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Matches that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesFindFirstOrThrowArgs} args - Arguments to find a Matches
     * @example
     * // Get one Matches
     * const matches = await prisma.matches.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends matchesFindFirstOrThrowArgs>(args?: SelectSubset<T, matchesFindFirstOrThrowArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Matches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Matches
     * const matches = await prisma.matches.findMany()
     * 
     * // Get first 10 Matches
     * const matches = await prisma.matches.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const matchesWithIdOnly = await prisma.matches.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends matchesFindManyArgs>(args?: SelectSubset<T, matchesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Matches.
     * @param {matchesCreateArgs} args - Arguments to create a Matches.
     * @example
     * // Create one Matches
     * const Matches = await prisma.matches.create({
     *   data: {
     *     // ... data to create a Matches
     *   }
     * })
     * 
     */
    create<T extends matchesCreateArgs>(args: SelectSubset<T, matchesCreateArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Matches.
     * @param {matchesCreateManyArgs} args - Arguments to create many Matches.
     * @example
     * // Create many Matches
     * const matches = await prisma.matches.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends matchesCreateManyArgs>(args?: SelectSubset<T, matchesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Matches and returns the data saved in the database.
     * @param {matchesCreateManyAndReturnArgs} args - Arguments to create many Matches.
     * @example
     * // Create many Matches
     * const matches = await prisma.matches.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Matches and only return the `id`
     * const matchesWithIdOnly = await prisma.matches.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends matchesCreateManyAndReturnArgs>(args?: SelectSubset<T, matchesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Matches.
     * @param {matchesDeleteArgs} args - Arguments to delete one Matches.
     * @example
     * // Delete one Matches
     * const Matches = await prisma.matches.delete({
     *   where: {
     *     // ... filter to delete one Matches
     *   }
     * })
     * 
     */
    delete<T extends matchesDeleteArgs>(args: SelectSubset<T, matchesDeleteArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Matches.
     * @param {matchesUpdateArgs} args - Arguments to update one Matches.
     * @example
     * // Update one Matches
     * const matches = await prisma.matches.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends matchesUpdateArgs>(args: SelectSubset<T, matchesUpdateArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Matches.
     * @param {matchesDeleteManyArgs} args - Arguments to filter Matches to delete.
     * @example
     * // Delete a few Matches
     * const { count } = await prisma.matches.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends matchesDeleteManyArgs>(args?: SelectSubset<T, matchesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Matches
     * const matches = await prisma.matches.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends matchesUpdateManyArgs>(args: SelectSubset<T, matchesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Matches and returns the data updated in the database.
     * @param {matchesUpdateManyAndReturnArgs} args - Arguments to update many Matches.
     * @example
     * // Update many Matches
     * const matches = await prisma.matches.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Matches and only return the `id`
     * const matchesWithIdOnly = await prisma.matches.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends matchesUpdateManyAndReturnArgs>(args: SelectSubset<T, matchesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Matches.
     * @param {matchesUpsertArgs} args - Arguments to update or create a Matches.
     * @example
     * // Update or create a Matches
     * const matches = await prisma.matches.upsert({
     *   create: {
     *     // ... data to create a Matches
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Matches we want to update
     *   }
     * })
     */
    upsert<T extends matchesUpsertArgs>(args: SelectSubset<T, matchesUpsertArgs<ExtArgs>>): Prisma__matchesClient<$Result.GetResult<Prisma.$matchesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesCountArgs} args - Arguments to filter Matches to count.
     * @example
     * // Count the number of Matches
     * const count = await prisma.matches.count({
     *   where: {
     *     // ... the filter for the Matches we want to count
     *   }
     * })
    **/
    count<T extends matchesCountArgs>(
      args?: Subset<T, matchesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MatchesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MatchesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MatchesAggregateArgs>(args: Subset<T, MatchesAggregateArgs>): Prisma.PrismaPromise<GetMatchesAggregateType<T>>

    /**
     * Group by Matches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {matchesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends matchesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: matchesGroupByArgs['orderBy'] }
        : { orderBy?: matchesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, matchesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMatchesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the matches model
   */
  readonly fields: matchesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for matches.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__matchesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    player_matches<T extends matches$player_matchesArgs<ExtArgs> = {}>(args?: Subset<T, matches$player_matchesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$player_matchesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the matches model
   */
  interface matchesFieldRefs {
    readonly id: FieldRef<"matches", 'Int'>
    readonly match_date: FieldRef<"matches", 'DateTime'>
    readonly team_a_score: FieldRef<"matches", 'Int'>
    readonly team_b_score: FieldRef<"matches", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * matches findUnique
   */
  export type matchesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter, which matches to fetch.
     */
    where: matchesWhereUniqueInput
  }

  /**
   * matches findUniqueOrThrow
   */
  export type matchesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter, which matches to fetch.
     */
    where: matchesWhereUniqueInput
  }

  /**
   * matches findFirst
   */
  export type matchesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter, which matches to fetch.
     */
    where?: matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of matches to fetch.
     */
    orderBy?: matchesOrderByWithRelationInput | matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for matches.
     */
    cursor?: matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of matches.
     */
    distinct?: MatchesScalarFieldEnum | MatchesScalarFieldEnum[]
  }

  /**
   * matches findFirstOrThrow
   */
  export type matchesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter, which matches to fetch.
     */
    where?: matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of matches to fetch.
     */
    orderBy?: matchesOrderByWithRelationInput | matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for matches.
     */
    cursor?: matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` matches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of matches.
     */
    distinct?: MatchesScalarFieldEnum | MatchesScalarFieldEnum[]
  }

  /**
   * matches findMany
   */
  export type matchesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter, which matches to fetch.
     */
    where?: matchesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of matches to fetch.
     */
    orderBy?: matchesOrderByWithRelationInput | matchesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing matches.
     */
    cursor?: matchesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` matches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` matches.
     */
    skip?: number
    distinct?: MatchesScalarFieldEnum | MatchesScalarFieldEnum[]
  }

  /**
   * matches create
   */
  export type matchesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * The data needed to create a matches.
     */
    data: XOR<matchesCreateInput, matchesUncheckedCreateInput>
  }

  /**
   * matches createMany
   */
  export type matchesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many matches.
     */
    data: matchesCreateManyInput | matchesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * matches createManyAndReturn
   */
  export type matchesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * The data used to create many matches.
     */
    data: matchesCreateManyInput | matchesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * matches update
   */
  export type matchesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * The data needed to update a matches.
     */
    data: XOR<matchesUpdateInput, matchesUncheckedUpdateInput>
    /**
     * Choose, which matches to update.
     */
    where: matchesWhereUniqueInput
  }

  /**
   * matches updateMany
   */
  export type matchesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update matches.
     */
    data: XOR<matchesUpdateManyMutationInput, matchesUncheckedUpdateManyInput>
    /**
     * Filter which matches to update
     */
    where?: matchesWhereInput
    /**
     * Limit how many matches to update.
     */
    limit?: number
  }

  /**
   * matches updateManyAndReturn
   */
  export type matchesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * The data used to update matches.
     */
    data: XOR<matchesUpdateManyMutationInput, matchesUncheckedUpdateManyInput>
    /**
     * Filter which matches to update
     */
    where?: matchesWhereInput
    /**
     * Limit how many matches to update.
     */
    limit?: number
  }

  /**
   * matches upsert
   */
  export type matchesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * The filter to search for the matches to update in case it exists.
     */
    where: matchesWhereUniqueInput
    /**
     * In case the matches found by the `where` argument doesn't exist, create a new matches with this data.
     */
    create: XOR<matchesCreateInput, matchesUncheckedCreateInput>
    /**
     * In case the matches was found with the provided `where` argument, update it with this data.
     */
    update: XOR<matchesUpdateInput, matchesUncheckedUpdateInput>
  }

  /**
   * matches delete
   */
  export type matchesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
    /**
     * Filter which matches to delete.
     */
    where: matchesWhereUniqueInput
  }

  /**
   * matches deleteMany
   */
  export type matchesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which matches to delete
     */
    where?: matchesWhereInput
    /**
     * Limit how many matches to delete.
     */
    limit?: number
  }

  /**
   * matches.player_matches
   */
  export type matches$player_matchesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the player_matches
     */
    select?: player_matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the player_matches
     */
    omit?: player_matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: player_matchesInclude<ExtArgs> | null
    where?: player_matchesWhereInput
    orderBy?: player_matchesOrderByWithRelationInput | player_matchesOrderByWithRelationInput[]
    cursor?: player_matchesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Player_matchesScalarFieldEnum | Player_matchesScalarFieldEnum[]
  }

  /**
   * matches without action
   */
  export type matchesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the matches
     */
    select?: matchesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the matches
     */
    omit?: matchesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: matchesInclude<ExtArgs> | null
  }


  /**
   * Model aggregated_recent_performance
   */

  export type AggregateAggregated_recent_performance = {
    _count: Aggregated_recent_performanceCountAggregateOutputType | null
    _avg: Aggregated_recent_performanceAvgAggregateOutputType | null
    _sum: Aggregated_recent_performanceSumAggregateOutputType | null
    _min: Aggregated_recent_performanceMinAggregateOutputType | null
    _max: Aggregated_recent_performanceMaxAggregateOutputType | null
  }

  export type Aggregated_recent_performanceAvgAggregateOutputType = {
    id: number | null
    player_id: number | null
    last_5_goals: number | null
  }

  export type Aggregated_recent_performanceSumAggregateOutputType = {
    id: number | null
    player_id: number | null
    last_5_goals: number | null
  }

  export type Aggregated_recent_performanceMinAggregateOutputType = {
    id: number | null
    player_id: number | null
    last_5_goals: number | null
    last_updated: Date | null
  }

  export type Aggregated_recent_performanceMaxAggregateOutputType = {
    id: number | null
    player_id: number | null
    last_5_goals: number | null
    last_updated: Date | null
  }

  export type Aggregated_recent_performanceCountAggregateOutputType = {
    id: number
    player_id: number
    last_5_goals: number
    last_5_games: number
    last_updated: number
    _all: number
  }


  export type Aggregated_recent_performanceAvgAggregateInputType = {
    id?: true
    player_id?: true
    last_5_goals?: true
  }

  export type Aggregated_recent_performanceSumAggregateInputType = {
    id?: true
    player_id?: true
    last_5_goals?: true
  }

  export type Aggregated_recent_performanceMinAggregateInputType = {
    id?: true
    player_id?: true
    last_5_goals?: true
    last_updated?: true
  }

  export type Aggregated_recent_performanceMaxAggregateInputType = {
    id?: true
    player_id?: true
    last_5_goals?: true
    last_updated?: true
  }

  export type Aggregated_recent_performanceCountAggregateInputType = {
    id?: true
    player_id?: true
    last_5_goals?: true
    last_5_games?: true
    last_updated?: true
    _all?: true
  }

  export type Aggregated_recent_performanceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which aggregated_recent_performance to aggregate.
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of aggregated_recent_performances to fetch.
     */
    orderBy?: aggregated_recent_performanceOrderByWithRelationInput | aggregated_recent_performanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: aggregated_recent_performanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` aggregated_recent_performances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` aggregated_recent_performances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned aggregated_recent_performances
    **/
    _count?: true | Aggregated_recent_performanceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Aggregated_recent_performanceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Aggregated_recent_performanceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Aggregated_recent_performanceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Aggregated_recent_performanceMaxAggregateInputType
  }

  export type GetAggregated_recent_performanceAggregateType<T extends Aggregated_recent_performanceAggregateArgs> = {
        [P in keyof T & keyof AggregateAggregated_recent_performance]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAggregated_recent_performance[P]>
      : GetScalarType<T[P], AggregateAggregated_recent_performance[P]>
  }




  export type aggregated_recent_performanceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: aggregated_recent_performanceWhereInput
    orderBy?: aggregated_recent_performanceOrderByWithAggregationInput | aggregated_recent_performanceOrderByWithAggregationInput[]
    by: Aggregated_recent_performanceScalarFieldEnum[] | Aggregated_recent_performanceScalarFieldEnum
    having?: aggregated_recent_performanceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Aggregated_recent_performanceCountAggregateInputType | true
    _avg?: Aggregated_recent_performanceAvgAggregateInputType
    _sum?: Aggregated_recent_performanceSumAggregateInputType
    _min?: Aggregated_recent_performanceMinAggregateInputType
    _max?: Aggregated_recent_performanceMaxAggregateInputType
  }

  export type Aggregated_recent_performanceGroupByOutputType = {
    id: number
    player_id: number
    last_5_goals: number
    last_5_games: JsonValue
    last_updated: Date
    _count: Aggregated_recent_performanceCountAggregateOutputType | null
    _avg: Aggregated_recent_performanceAvgAggregateOutputType | null
    _sum: Aggregated_recent_performanceSumAggregateOutputType | null
    _min: Aggregated_recent_performanceMinAggregateOutputType | null
    _max: Aggregated_recent_performanceMaxAggregateOutputType | null
  }

  type GetAggregated_recent_performanceGroupByPayload<T extends aggregated_recent_performanceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Aggregated_recent_performanceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Aggregated_recent_performanceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Aggregated_recent_performanceGroupByOutputType[P]>
            : GetScalarType<T[P], Aggregated_recent_performanceGroupByOutputType[P]>
        }
      >
    >


  export type aggregated_recent_performanceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    last_5_goals?: boolean
    last_5_games?: boolean
    last_updated?: boolean
  }, ExtArgs["result"]["aggregated_recent_performance"]>

  export type aggregated_recent_performanceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    last_5_goals?: boolean
    last_5_games?: boolean
    last_updated?: boolean
  }, ExtArgs["result"]["aggregated_recent_performance"]>

  export type aggregated_recent_performanceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    player_id?: boolean
    last_5_goals?: boolean
    last_5_games?: boolean
    last_updated?: boolean
  }, ExtArgs["result"]["aggregated_recent_performance"]>

  export type aggregated_recent_performanceSelectScalar = {
    id?: boolean
    player_id?: boolean
    last_5_goals?: boolean
    last_5_games?: boolean
    last_updated?: boolean
  }

  export type aggregated_recent_performanceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "player_id" | "last_5_goals" | "last_5_games" | "last_updated", ExtArgs["result"]["aggregated_recent_performance"]>

  export type $aggregated_recent_performancePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "aggregated_recent_performance"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      player_id: number
      last_5_goals: number
      last_5_games: Prisma.JsonValue
      last_updated: Date
    }, ExtArgs["result"]["aggregated_recent_performance"]>
    composites: {}
  }

  type aggregated_recent_performanceGetPayload<S extends boolean | null | undefined | aggregated_recent_performanceDefaultArgs> = $Result.GetResult<Prisma.$aggregated_recent_performancePayload, S>

  type aggregated_recent_performanceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<aggregated_recent_performanceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Aggregated_recent_performanceCountAggregateInputType | true
    }

  export interface aggregated_recent_performanceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['aggregated_recent_performance'], meta: { name: 'aggregated_recent_performance' } }
    /**
     * Find zero or one Aggregated_recent_performance that matches the filter.
     * @param {aggregated_recent_performanceFindUniqueArgs} args - Arguments to find a Aggregated_recent_performance
     * @example
     * // Get one Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends aggregated_recent_performanceFindUniqueArgs>(args: SelectSubset<T, aggregated_recent_performanceFindUniqueArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Aggregated_recent_performance that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {aggregated_recent_performanceFindUniqueOrThrowArgs} args - Arguments to find a Aggregated_recent_performance
     * @example
     * // Get one Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends aggregated_recent_performanceFindUniqueOrThrowArgs>(args: SelectSubset<T, aggregated_recent_performanceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Aggregated_recent_performance that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceFindFirstArgs} args - Arguments to find a Aggregated_recent_performance
     * @example
     * // Get one Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends aggregated_recent_performanceFindFirstArgs>(args?: SelectSubset<T, aggregated_recent_performanceFindFirstArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Aggregated_recent_performance that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceFindFirstOrThrowArgs} args - Arguments to find a Aggregated_recent_performance
     * @example
     * // Get one Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends aggregated_recent_performanceFindFirstOrThrowArgs>(args?: SelectSubset<T, aggregated_recent_performanceFindFirstOrThrowArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Aggregated_recent_performances that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Aggregated_recent_performances
     * const aggregated_recent_performances = await prisma.aggregated_recent_performance.findMany()
     * 
     * // Get first 10 Aggregated_recent_performances
     * const aggregated_recent_performances = await prisma.aggregated_recent_performance.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aggregated_recent_performanceWithIdOnly = await prisma.aggregated_recent_performance.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends aggregated_recent_performanceFindManyArgs>(args?: SelectSubset<T, aggregated_recent_performanceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Aggregated_recent_performance.
     * @param {aggregated_recent_performanceCreateArgs} args - Arguments to create a Aggregated_recent_performance.
     * @example
     * // Create one Aggregated_recent_performance
     * const Aggregated_recent_performance = await prisma.aggregated_recent_performance.create({
     *   data: {
     *     // ... data to create a Aggregated_recent_performance
     *   }
     * })
     * 
     */
    create<T extends aggregated_recent_performanceCreateArgs>(args: SelectSubset<T, aggregated_recent_performanceCreateArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Aggregated_recent_performances.
     * @param {aggregated_recent_performanceCreateManyArgs} args - Arguments to create many Aggregated_recent_performances.
     * @example
     * // Create many Aggregated_recent_performances
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends aggregated_recent_performanceCreateManyArgs>(args?: SelectSubset<T, aggregated_recent_performanceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Aggregated_recent_performances and returns the data saved in the database.
     * @param {aggregated_recent_performanceCreateManyAndReturnArgs} args - Arguments to create many Aggregated_recent_performances.
     * @example
     * // Create many Aggregated_recent_performances
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Aggregated_recent_performances and only return the `id`
     * const aggregated_recent_performanceWithIdOnly = await prisma.aggregated_recent_performance.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends aggregated_recent_performanceCreateManyAndReturnArgs>(args?: SelectSubset<T, aggregated_recent_performanceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Aggregated_recent_performance.
     * @param {aggregated_recent_performanceDeleteArgs} args - Arguments to delete one Aggregated_recent_performance.
     * @example
     * // Delete one Aggregated_recent_performance
     * const Aggregated_recent_performance = await prisma.aggregated_recent_performance.delete({
     *   where: {
     *     // ... filter to delete one Aggregated_recent_performance
     *   }
     * })
     * 
     */
    delete<T extends aggregated_recent_performanceDeleteArgs>(args: SelectSubset<T, aggregated_recent_performanceDeleteArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Aggregated_recent_performance.
     * @param {aggregated_recent_performanceUpdateArgs} args - Arguments to update one Aggregated_recent_performance.
     * @example
     * // Update one Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends aggregated_recent_performanceUpdateArgs>(args: SelectSubset<T, aggregated_recent_performanceUpdateArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Aggregated_recent_performances.
     * @param {aggregated_recent_performanceDeleteManyArgs} args - Arguments to filter Aggregated_recent_performances to delete.
     * @example
     * // Delete a few Aggregated_recent_performances
     * const { count } = await prisma.aggregated_recent_performance.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends aggregated_recent_performanceDeleteManyArgs>(args?: SelectSubset<T, aggregated_recent_performanceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Aggregated_recent_performances.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Aggregated_recent_performances
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends aggregated_recent_performanceUpdateManyArgs>(args: SelectSubset<T, aggregated_recent_performanceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Aggregated_recent_performances and returns the data updated in the database.
     * @param {aggregated_recent_performanceUpdateManyAndReturnArgs} args - Arguments to update many Aggregated_recent_performances.
     * @example
     * // Update many Aggregated_recent_performances
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Aggregated_recent_performances and only return the `id`
     * const aggregated_recent_performanceWithIdOnly = await prisma.aggregated_recent_performance.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends aggregated_recent_performanceUpdateManyAndReturnArgs>(args: SelectSubset<T, aggregated_recent_performanceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Aggregated_recent_performance.
     * @param {aggregated_recent_performanceUpsertArgs} args - Arguments to update or create a Aggregated_recent_performance.
     * @example
     * // Update or create a Aggregated_recent_performance
     * const aggregated_recent_performance = await prisma.aggregated_recent_performance.upsert({
     *   create: {
     *     // ... data to create a Aggregated_recent_performance
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Aggregated_recent_performance we want to update
     *   }
     * })
     */
    upsert<T extends aggregated_recent_performanceUpsertArgs>(args: SelectSubset<T, aggregated_recent_performanceUpsertArgs<ExtArgs>>): Prisma__aggregated_recent_performanceClient<$Result.GetResult<Prisma.$aggregated_recent_performancePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Aggregated_recent_performances.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceCountArgs} args - Arguments to filter Aggregated_recent_performances to count.
     * @example
     * // Count the number of Aggregated_recent_performances
     * const count = await prisma.aggregated_recent_performance.count({
     *   where: {
     *     // ... the filter for the Aggregated_recent_performances we want to count
     *   }
     * })
    **/
    count<T extends aggregated_recent_performanceCountArgs>(
      args?: Subset<T, aggregated_recent_performanceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Aggregated_recent_performanceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Aggregated_recent_performance.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Aggregated_recent_performanceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Aggregated_recent_performanceAggregateArgs>(args: Subset<T, Aggregated_recent_performanceAggregateArgs>): Prisma.PrismaPromise<GetAggregated_recent_performanceAggregateType<T>>

    /**
     * Group by Aggregated_recent_performance.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {aggregated_recent_performanceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends aggregated_recent_performanceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: aggregated_recent_performanceGroupByArgs['orderBy'] }
        : { orderBy?: aggregated_recent_performanceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, aggregated_recent_performanceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAggregated_recent_performanceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the aggregated_recent_performance model
   */
  readonly fields: aggregated_recent_performanceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for aggregated_recent_performance.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__aggregated_recent_performanceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the aggregated_recent_performance model
   */
  interface aggregated_recent_performanceFieldRefs {
    readonly id: FieldRef<"aggregated_recent_performance", 'Int'>
    readonly player_id: FieldRef<"aggregated_recent_performance", 'Int'>
    readonly last_5_goals: FieldRef<"aggregated_recent_performance", 'Int'>
    readonly last_5_games: FieldRef<"aggregated_recent_performance", 'Json'>
    readonly last_updated: FieldRef<"aggregated_recent_performance", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * aggregated_recent_performance findUnique
   */
  export type aggregated_recent_performanceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter, which aggregated_recent_performance to fetch.
     */
    where: aggregated_recent_performanceWhereUniqueInput
  }

  /**
   * aggregated_recent_performance findUniqueOrThrow
   */
  export type aggregated_recent_performanceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter, which aggregated_recent_performance to fetch.
     */
    where: aggregated_recent_performanceWhereUniqueInput
  }

  /**
   * aggregated_recent_performance findFirst
   */
  export type aggregated_recent_performanceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter, which aggregated_recent_performance to fetch.
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of aggregated_recent_performances to fetch.
     */
    orderBy?: aggregated_recent_performanceOrderByWithRelationInput | aggregated_recent_performanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for aggregated_recent_performances.
     */
    cursor?: aggregated_recent_performanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` aggregated_recent_performances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` aggregated_recent_performances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of aggregated_recent_performances.
     */
    distinct?: Aggregated_recent_performanceScalarFieldEnum | Aggregated_recent_performanceScalarFieldEnum[]
  }

  /**
   * aggregated_recent_performance findFirstOrThrow
   */
  export type aggregated_recent_performanceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter, which aggregated_recent_performance to fetch.
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of aggregated_recent_performances to fetch.
     */
    orderBy?: aggregated_recent_performanceOrderByWithRelationInput | aggregated_recent_performanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for aggregated_recent_performances.
     */
    cursor?: aggregated_recent_performanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` aggregated_recent_performances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` aggregated_recent_performances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of aggregated_recent_performances.
     */
    distinct?: Aggregated_recent_performanceScalarFieldEnum | Aggregated_recent_performanceScalarFieldEnum[]
  }

  /**
   * aggregated_recent_performance findMany
   */
  export type aggregated_recent_performanceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter, which aggregated_recent_performances to fetch.
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of aggregated_recent_performances to fetch.
     */
    orderBy?: aggregated_recent_performanceOrderByWithRelationInput | aggregated_recent_performanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing aggregated_recent_performances.
     */
    cursor?: aggregated_recent_performanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` aggregated_recent_performances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` aggregated_recent_performances.
     */
    skip?: number
    distinct?: Aggregated_recent_performanceScalarFieldEnum | Aggregated_recent_performanceScalarFieldEnum[]
  }

  /**
   * aggregated_recent_performance create
   */
  export type aggregated_recent_performanceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * The data needed to create a aggregated_recent_performance.
     */
    data: XOR<aggregated_recent_performanceCreateInput, aggregated_recent_performanceUncheckedCreateInput>
  }

  /**
   * aggregated_recent_performance createMany
   */
  export type aggregated_recent_performanceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many aggregated_recent_performances.
     */
    data: aggregated_recent_performanceCreateManyInput | aggregated_recent_performanceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * aggregated_recent_performance createManyAndReturn
   */
  export type aggregated_recent_performanceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * The data used to create many aggregated_recent_performances.
     */
    data: aggregated_recent_performanceCreateManyInput | aggregated_recent_performanceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * aggregated_recent_performance update
   */
  export type aggregated_recent_performanceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * The data needed to update a aggregated_recent_performance.
     */
    data: XOR<aggregated_recent_performanceUpdateInput, aggregated_recent_performanceUncheckedUpdateInput>
    /**
     * Choose, which aggregated_recent_performance to update.
     */
    where: aggregated_recent_performanceWhereUniqueInput
  }

  /**
   * aggregated_recent_performance updateMany
   */
  export type aggregated_recent_performanceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update aggregated_recent_performances.
     */
    data: XOR<aggregated_recent_performanceUpdateManyMutationInput, aggregated_recent_performanceUncheckedUpdateManyInput>
    /**
     * Filter which aggregated_recent_performances to update
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * Limit how many aggregated_recent_performances to update.
     */
    limit?: number
  }

  /**
   * aggregated_recent_performance updateManyAndReturn
   */
  export type aggregated_recent_performanceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * The data used to update aggregated_recent_performances.
     */
    data: XOR<aggregated_recent_performanceUpdateManyMutationInput, aggregated_recent_performanceUncheckedUpdateManyInput>
    /**
     * Filter which aggregated_recent_performances to update
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * Limit how many aggregated_recent_performances to update.
     */
    limit?: number
  }

  /**
   * aggregated_recent_performance upsert
   */
  export type aggregated_recent_performanceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * The filter to search for the aggregated_recent_performance to update in case it exists.
     */
    where: aggregated_recent_performanceWhereUniqueInput
    /**
     * In case the aggregated_recent_performance found by the `where` argument doesn't exist, create a new aggregated_recent_performance with this data.
     */
    create: XOR<aggregated_recent_performanceCreateInput, aggregated_recent_performanceUncheckedCreateInput>
    /**
     * In case the aggregated_recent_performance was found with the provided `where` argument, update it with this data.
     */
    update: XOR<aggregated_recent_performanceUpdateInput, aggregated_recent_performanceUncheckedUpdateInput>
  }

  /**
   * aggregated_recent_performance delete
   */
  export type aggregated_recent_performanceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
    /**
     * Filter which aggregated_recent_performance to delete.
     */
    where: aggregated_recent_performanceWhereUniqueInput
  }

  /**
   * aggregated_recent_performance deleteMany
   */
  export type aggregated_recent_performanceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which aggregated_recent_performances to delete
     */
    where?: aggregated_recent_performanceWhereInput
    /**
     * Limit how many aggregated_recent_performances to delete.
     */
    limit?: number
  }

  /**
   * aggregated_recent_performance without action
   */
  export type aggregated_recent_performanceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the aggregated_recent_performance
     */
    select?: aggregated_recent_performanceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the aggregated_recent_performance
     */
    omit?: aggregated_recent_performanceOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const PlayersScalarFieldEnum: {
    player_id: 'player_id',
    is_ringer: 'is_ringer',
    is_retired: 'is_retired'
  };

  export type PlayersScalarFieldEnum = (typeof PlayersScalarFieldEnum)[keyof typeof PlayersScalarFieldEnum]


  export const Player_matchesScalarFieldEnum: {
    id: 'id',
    player_id: 'player_id',
    team: 'team',
    goals: 'goals',
    result: 'result',
    heavy_win: 'heavy_win',
    heavy_loss: 'heavy_loss',
    match_id: 'match_id'
  };

  export type Player_matchesScalarFieldEnum = (typeof Player_matchesScalarFieldEnum)[keyof typeof Player_matchesScalarFieldEnum]


  export const MatchesScalarFieldEnum: {
    id: 'id',
    match_date: 'match_date',
    team_a_score: 'team_a_score',
    team_b_score: 'team_b_score'
  };

  export type MatchesScalarFieldEnum = (typeof MatchesScalarFieldEnum)[keyof typeof MatchesScalarFieldEnum]


  export const Aggregated_recent_performanceScalarFieldEnum: {
    id: 'id',
    player_id: 'player_id',
    last_5_goals: 'last_5_goals',
    last_5_games: 'last_5_games',
    last_updated: 'last_updated'
  };

  export type Aggregated_recent_performanceScalarFieldEnum = (typeof Aggregated_recent_performanceScalarFieldEnum)[keyof typeof Aggregated_recent_performanceScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type playersWhereInput = {
    AND?: playersWhereInput | playersWhereInput[]
    OR?: playersWhereInput[]
    NOT?: playersWhereInput | playersWhereInput[]
    player_id?: IntFilter<"players"> | number
    is_ringer?: BoolFilter<"players"> | boolean
    is_retired?: BoolFilter<"players"> | boolean
  }

  export type playersOrderByWithRelationInput = {
    player_id?: SortOrder
    is_ringer?: SortOrder
    is_retired?: SortOrder
  }

  export type playersWhereUniqueInput = Prisma.AtLeast<{
    player_id?: number
    AND?: playersWhereInput | playersWhereInput[]
    OR?: playersWhereInput[]
    NOT?: playersWhereInput | playersWhereInput[]
    is_ringer?: BoolFilter<"players"> | boolean
    is_retired?: BoolFilter<"players"> | boolean
  }, "player_id">

  export type playersOrderByWithAggregationInput = {
    player_id?: SortOrder
    is_ringer?: SortOrder
    is_retired?: SortOrder
    _count?: playersCountOrderByAggregateInput
    _avg?: playersAvgOrderByAggregateInput
    _max?: playersMaxOrderByAggregateInput
    _min?: playersMinOrderByAggregateInput
    _sum?: playersSumOrderByAggregateInput
  }

  export type playersScalarWhereWithAggregatesInput = {
    AND?: playersScalarWhereWithAggregatesInput | playersScalarWhereWithAggregatesInput[]
    OR?: playersScalarWhereWithAggregatesInput[]
    NOT?: playersScalarWhereWithAggregatesInput | playersScalarWhereWithAggregatesInput[]
    player_id?: IntWithAggregatesFilter<"players"> | number
    is_ringer?: BoolWithAggregatesFilter<"players"> | boolean
    is_retired?: BoolWithAggregatesFilter<"players"> | boolean
  }

  export type player_matchesWhereInput = {
    AND?: player_matchesWhereInput | player_matchesWhereInput[]
    OR?: player_matchesWhereInput[]
    NOT?: player_matchesWhereInput | player_matchesWhereInput[]
    id?: IntFilter<"player_matches"> | number
    player_id?: IntFilter<"player_matches"> | number
    team?: StringNullableFilter<"player_matches"> | string | null
    goals?: IntNullableFilter<"player_matches"> | number | null
    result?: StringNullableFilter<"player_matches"> | string | null
    heavy_win?: BoolNullableFilter<"player_matches"> | boolean | null
    heavy_loss?: BoolNullableFilter<"player_matches"> | boolean | null
    match_id?: IntNullableFilter<"player_matches"> | number | null
    matches?: XOR<MatchesNullableScalarRelationFilter, matchesWhereInput> | null
  }

  export type player_matchesOrderByWithRelationInput = {
    id?: SortOrder
    player_id?: SortOrder
    team?: SortOrderInput | SortOrder
    goals?: SortOrderInput | SortOrder
    result?: SortOrderInput | SortOrder
    heavy_win?: SortOrderInput | SortOrder
    heavy_loss?: SortOrderInput | SortOrder
    match_id?: SortOrderInput | SortOrder
    matches?: matchesOrderByWithRelationInput
  }

  export type player_matchesWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: player_matchesWhereInput | player_matchesWhereInput[]
    OR?: player_matchesWhereInput[]
    NOT?: player_matchesWhereInput | player_matchesWhereInput[]
    player_id?: IntFilter<"player_matches"> | number
    team?: StringNullableFilter<"player_matches"> | string | null
    goals?: IntNullableFilter<"player_matches"> | number | null
    result?: StringNullableFilter<"player_matches"> | string | null
    heavy_win?: BoolNullableFilter<"player_matches"> | boolean | null
    heavy_loss?: BoolNullableFilter<"player_matches"> | boolean | null
    match_id?: IntNullableFilter<"player_matches"> | number | null
    matches?: XOR<MatchesNullableScalarRelationFilter, matchesWhereInput> | null
  }, "id">

  export type player_matchesOrderByWithAggregationInput = {
    id?: SortOrder
    player_id?: SortOrder
    team?: SortOrderInput | SortOrder
    goals?: SortOrderInput | SortOrder
    result?: SortOrderInput | SortOrder
    heavy_win?: SortOrderInput | SortOrder
    heavy_loss?: SortOrderInput | SortOrder
    match_id?: SortOrderInput | SortOrder
    _count?: player_matchesCountOrderByAggregateInput
    _avg?: player_matchesAvgOrderByAggregateInput
    _max?: player_matchesMaxOrderByAggregateInput
    _min?: player_matchesMinOrderByAggregateInput
    _sum?: player_matchesSumOrderByAggregateInput
  }

  export type player_matchesScalarWhereWithAggregatesInput = {
    AND?: player_matchesScalarWhereWithAggregatesInput | player_matchesScalarWhereWithAggregatesInput[]
    OR?: player_matchesScalarWhereWithAggregatesInput[]
    NOT?: player_matchesScalarWhereWithAggregatesInput | player_matchesScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"player_matches"> | number
    player_id?: IntWithAggregatesFilter<"player_matches"> | number
    team?: StringNullableWithAggregatesFilter<"player_matches"> | string | null
    goals?: IntNullableWithAggregatesFilter<"player_matches"> | number | null
    result?: StringNullableWithAggregatesFilter<"player_matches"> | string | null
    heavy_win?: BoolNullableWithAggregatesFilter<"player_matches"> | boolean | null
    heavy_loss?: BoolNullableWithAggregatesFilter<"player_matches"> | boolean | null
    match_id?: IntNullableWithAggregatesFilter<"player_matches"> | number | null
  }

  export type matchesWhereInput = {
    AND?: matchesWhereInput | matchesWhereInput[]
    OR?: matchesWhereInput[]
    NOT?: matchesWhereInput | matchesWhereInput[]
    id?: IntFilter<"matches"> | number
    match_date?: DateTimeFilter<"matches"> | Date | string
    team_a_score?: IntFilter<"matches"> | number
    team_b_score?: IntFilter<"matches"> | number
    player_matches?: Player_matchesListRelationFilter
  }

  export type matchesOrderByWithRelationInput = {
    id?: SortOrder
    match_date?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
    player_matches?: player_matchesOrderByRelationAggregateInput
  }

  export type matchesWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: matchesWhereInput | matchesWhereInput[]
    OR?: matchesWhereInput[]
    NOT?: matchesWhereInput | matchesWhereInput[]
    match_date?: DateTimeFilter<"matches"> | Date | string
    team_a_score?: IntFilter<"matches"> | number
    team_b_score?: IntFilter<"matches"> | number
    player_matches?: Player_matchesListRelationFilter
  }, "id">

  export type matchesOrderByWithAggregationInput = {
    id?: SortOrder
    match_date?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
    _count?: matchesCountOrderByAggregateInput
    _avg?: matchesAvgOrderByAggregateInput
    _max?: matchesMaxOrderByAggregateInput
    _min?: matchesMinOrderByAggregateInput
    _sum?: matchesSumOrderByAggregateInput
  }

  export type matchesScalarWhereWithAggregatesInput = {
    AND?: matchesScalarWhereWithAggregatesInput | matchesScalarWhereWithAggregatesInput[]
    OR?: matchesScalarWhereWithAggregatesInput[]
    NOT?: matchesScalarWhereWithAggregatesInput | matchesScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"matches"> | number
    match_date?: DateTimeWithAggregatesFilter<"matches"> | Date | string
    team_a_score?: IntWithAggregatesFilter<"matches"> | number
    team_b_score?: IntWithAggregatesFilter<"matches"> | number
  }

  export type aggregated_recent_performanceWhereInput = {
    AND?: aggregated_recent_performanceWhereInput | aggregated_recent_performanceWhereInput[]
    OR?: aggregated_recent_performanceWhereInput[]
    NOT?: aggregated_recent_performanceWhereInput | aggregated_recent_performanceWhereInput[]
    id?: IntFilter<"aggregated_recent_performance"> | number
    player_id?: IntFilter<"aggregated_recent_performance"> | number
    last_5_goals?: IntFilter<"aggregated_recent_performance"> | number
    last_5_games?: JsonFilter<"aggregated_recent_performance">
    last_updated?: DateTimeFilter<"aggregated_recent_performance"> | Date | string
  }

  export type aggregated_recent_performanceOrderByWithRelationInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
    last_5_games?: SortOrder
    last_updated?: SortOrder
  }

  export type aggregated_recent_performanceWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: aggregated_recent_performanceWhereInput | aggregated_recent_performanceWhereInput[]
    OR?: aggregated_recent_performanceWhereInput[]
    NOT?: aggregated_recent_performanceWhereInput | aggregated_recent_performanceWhereInput[]
    player_id?: IntFilter<"aggregated_recent_performance"> | number
    last_5_goals?: IntFilter<"aggregated_recent_performance"> | number
    last_5_games?: JsonFilter<"aggregated_recent_performance">
    last_updated?: DateTimeFilter<"aggregated_recent_performance"> | Date | string
  }, "id">

  export type aggregated_recent_performanceOrderByWithAggregationInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
    last_5_games?: SortOrder
    last_updated?: SortOrder
    _count?: aggregated_recent_performanceCountOrderByAggregateInput
    _avg?: aggregated_recent_performanceAvgOrderByAggregateInput
    _max?: aggregated_recent_performanceMaxOrderByAggregateInput
    _min?: aggregated_recent_performanceMinOrderByAggregateInput
    _sum?: aggregated_recent_performanceSumOrderByAggregateInput
  }

  export type aggregated_recent_performanceScalarWhereWithAggregatesInput = {
    AND?: aggregated_recent_performanceScalarWhereWithAggregatesInput | aggregated_recent_performanceScalarWhereWithAggregatesInput[]
    OR?: aggregated_recent_performanceScalarWhereWithAggregatesInput[]
    NOT?: aggregated_recent_performanceScalarWhereWithAggregatesInput | aggregated_recent_performanceScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"aggregated_recent_performance"> | number
    player_id?: IntWithAggregatesFilter<"aggregated_recent_performance"> | number
    last_5_goals?: IntWithAggregatesFilter<"aggregated_recent_performance"> | number
    last_5_games?: JsonWithAggregatesFilter<"aggregated_recent_performance">
    last_updated?: DateTimeWithAggregatesFilter<"aggregated_recent_performance"> | Date | string
  }

  export type playersCreateInput = {
    player_id: number
    is_ringer: boolean
    is_retired: boolean
  }

  export type playersUncheckedCreateInput = {
    player_id: number
    is_ringer: boolean
    is_retired: boolean
  }

  export type playersUpdateInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    is_ringer?: BoolFieldUpdateOperationsInput | boolean
    is_retired?: BoolFieldUpdateOperationsInput | boolean
  }

  export type playersUncheckedUpdateInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    is_ringer?: BoolFieldUpdateOperationsInput | boolean
    is_retired?: BoolFieldUpdateOperationsInput | boolean
  }

  export type playersCreateManyInput = {
    player_id: number
    is_ringer: boolean
    is_retired: boolean
  }

  export type playersUpdateManyMutationInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    is_ringer?: BoolFieldUpdateOperationsInput | boolean
    is_retired?: BoolFieldUpdateOperationsInput | boolean
  }

  export type playersUncheckedUpdateManyInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    is_ringer?: BoolFieldUpdateOperationsInput | boolean
    is_retired?: BoolFieldUpdateOperationsInput | boolean
  }

  export type player_matchesCreateInput = {
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
    matches?: matchesCreateNestedOneWithoutPlayer_matchesInput
  }

  export type player_matchesUncheckedCreateInput = {
    id?: number
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
    match_id?: number | null
  }

  export type player_matchesUpdateInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
    matches?: matchesUpdateOneWithoutPlayer_matchesNestedInput
  }

  export type player_matchesUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
    match_id?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type player_matchesCreateManyInput = {
    id?: number
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
    match_id?: number | null
  }

  export type player_matchesUpdateManyMutationInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type player_matchesUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
    match_id?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type matchesCreateInput = {
    match_date: Date | string
    team_a_score: number
    team_b_score: number
    player_matches?: player_matchesCreateNestedManyWithoutMatchesInput
  }

  export type matchesUncheckedCreateInput = {
    id?: number
    match_date: Date | string
    team_a_score: number
    team_b_score: number
    player_matches?: player_matchesUncheckedCreateNestedManyWithoutMatchesInput
  }

  export type matchesUpdateInput = {
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
    player_matches?: player_matchesUpdateManyWithoutMatchesNestedInput
  }

  export type matchesUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
    player_matches?: player_matchesUncheckedUpdateManyWithoutMatchesNestedInput
  }

  export type matchesCreateManyInput = {
    id?: number
    match_date: Date | string
    team_a_score: number
    team_b_score: number
  }

  export type matchesUpdateManyMutationInput = {
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
  }

  export type matchesUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
  }

  export type aggregated_recent_performanceCreateInput = {
    player_id: number
    last_5_goals: number
    last_5_games: JsonNullValueInput | InputJsonValue
    last_updated: Date | string
  }

  export type aggregated_recent_performanceUncheckedCreateInput = {
    id?: number
    player_id: number
    last_5_goals: number
    last_5_games: JsonNullValueInput | InputJsonValue
    last_updated: Date | string
  }

  export type aggregated_recent_performanceUpdateInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    last_5_goals?: IntFieldUpdateOperationsInput | number
    last_5_games?: JsonNullValueInput | InputJsonValue
    last_updated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type aggregated_recent_performanceUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    last_5_goals?: IntFieldUpdateOperationsInput | number
    last_5_games?: JsonNullValueInput | InputJsonValue
    last_updated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type aggregated_recent_performanceCreateManyInput = {
    id?: number
    player_id: number
    last_5_goals: number
    last_5_games: JsonNullValueInput | InputJsonValue
    last_updated: Date | string
  }

  export type aggregated_recent_performanceUpdateManyMutationInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    last_5_goals?: IntFieldUpdateOperationsInput | number
    last_5_games?: JsonNullValueInput | InputJsonValue
    last_updated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type aggregated_recent_performanceUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    last_5_goals?: IntFieldUpdateOperationsInput | number
    last_5_games?: JsonNullValueInput | InputJsonValue
    last_updated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type playersCountOrderByAggregateInput = {
    player_id?: SortOrder
    is_ringer?: SortOrder
    is_retired?: SortOrder
  }

  export type playersAvgOrderByAggregateInput = {
    player_id?: SortOrder
  }

  export type playersMaxOrderByAggregateInput = {
    player_id?: SortOrder
    is_ringer?: SortOrder
    is_retired?: SortOrder
  }

  export type playersMinOrderByAggregateInput = {
    player_id?: SortOrder
    is_ringer?: SortOrder
    is_retired?: SortOrder
  }

  export type playersSumOrderByAggregateInput = {
    player_id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type MatchesNullableScalarRelationFilter = {
    is?: matchesWhereInput | null
    isNot?: matchesWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type player_matchesCountOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    team?: SortOrder
    goals?: SortOrder
    result?: SortOrder
    heavy_win?: SortOrder
    heavy_loss?: SortOrder
    match_id?: SortOrder
  }

  export type player_matchesAvgOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    goals?: SortOrder
    match_id?: SortOrder
  }

  export type player_matchesMaxOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    team?: SortOrder
    goals?: SortOrder
    result?: SortOrder
    heavy_win?: SortOrder
    heavy_loss?: SortOrder
    match_id?: SortOrder
  }

  export type player_matchesMinOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    team?: SortOrder
    goals?: SortOrder
    result?: SortOrder
    heavy_win?: SortOrder
    heavy_loss?: SortOrder
    match_id?: SortOrder
  }

  export type player_matchesSumOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    goals?: SortOrder
    match_id?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type Player_matchesListRelationFilter = {
    every?: player_matchesWhereInput
    some?: player_matchesWhereInput
    none?: player_matchesWhereInput
  }

  export type player_matchesOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type matchesCountOrderByAggregateInput = {
    id?: SortOrder
    match_date?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
  }

  export type matchesAvgOrderByAggregateInput = {
    id?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
  }

  export type matchesMaxOrderByAggregateInput = {
    id?: SortOrder
    match_date?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
  }

  export type matchesMinOrderByAggregateInput = {
    id?: SortOrder
    match_date?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
  }

  export type matchesSumOrderByAggregateInput = {
    id?: SortOrder
    team_a_score?: SortOrder
    team_b_score?: SortOrder
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type aggregated_recent_performanceCountOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
    last_5_games?: SortOrder
    last_updated?: SortOrder
  }

  export type aggregated_recent_performanceAvgOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
  }

  export type aggregated_recent_performanceMaxOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
    last_updated?: SortOrder
  }

  export type aggregated_recent_performanceMinOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
    last_updated?: SortOrder
  }

  export type aggregated_recent_performanceSumOrderByAggregateInput = {
    id?: SortOrder
    player_id?: SortOrder
    last_5_goals?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type matchesCreateNestedOneWithoutPlayer_matchesInput = {
    create?: XOR<matchesCreateWithoutPlayer_matchesInput, matchesUncheckedCreateWithoutPlayer_matchesInput>
    connectOrCreate?: matchesCreateOrConnectWithoutPlayer_matchesInput
    connect?: matchesWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type matchesUpdateOneWithoutPlayer_matchesNestedInput = {
    create?: XOR<matchesCreateWithoutPlayer_matchesInput, matchesUncheckedCreateWithoutPlayer_matchesInput>
    connectOrCreate?: matchesCreateOrConnectWithoutPlayer_matchesInput
    upsert?: matchesUpsertWithoutPlayer_matchesInput
    disconnect?: matchesWhereInput | boolean
    delete?: matchesWhereInput | boolean
    connect?: matchesWhereUniqueInput
    update?: XOR<XOR<matchesUpdateToOneWithWhereWithoutPlayer_matchesInput, matchesUpdateWithoutPlayer_matchesInput>, matchesUncheckedUpdateWithoutPlayer_matchesInput>
  }

  export type player_matchesCreateNestedManyWithoutMatchesInput = {
    create?: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput> | player_matchesCreateWithoutMatchesInput[] | player_matchesUncheckedCreateWithoutMatchesInput[]
    connectOrCreate?: player_matchesCreateOrConnectWithoutMatchesInput | player_matchesCreateOrConnectWithoutMatchesInput[]
    createMany?: player_matchesCreateManyMatchesInputEnvelope
    connect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
  }

  export type player_matchesUncheckedCreateNestedManyWithoutMatchesInput = {
    create?: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput> | player_matchesCreateWithoutMatchesInput[] | player_matchesUncheckedCreateWithoutMatchesInput[]
    connectOrCreate?: player_matchesCreateOrConnectWithoutMatchesInput | player_matchesCreateOrConnectWithoutMatchesInput[]
    createMany?: player_matchesCreateManyMatchesInputEnvelope
    connect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type player_matchesUpdateManyWithoutMatchesNestedInput = {
    create?: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput> | player_matchesCreateWithoutMatchesInput[] | player_matchesUncheckedCreateWithoutMatchesInput[]
    connectOrCreate?: player_matchesCreateOrConnectWithoutMatchesInput | player_matchesCreateOrConnectWithoutMatchesInput[]
    upsert?: player_matchesUpsertWithWhereUniqueWithoutMatchesInput | player_matchesUpsertWithWhereUniqueWithoutMatchesInput[]
    createMany?: player_matchesCreateManyMatchesInputEnvelope
    set?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    disconnect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    delete?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    connect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    update?: player_matchesUpdateWithWhereUniqueWithoutMatchesInput | player_matchesUpdateWithWhereUniqueWithoutMatchesInput[]
    updateMany?: player_matchesUpdateManyWithWhereWithoutMatchesInput | player_matchesUpdateManyWithWhereWithoutMatchesInput[]
    deleteMany?: player_matchesScalarWhereInput | player_matchesScalarWhereInput[]
  }

  export type player_matchesUncheckedUpdateManyWithoutMatchesNestedInput = {
    create?: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput> | player_matchesCreateWithoutMatchesInput[] | player_matchesUncheckedCreateWithoutMatchesInput[]
    connectOrCreate?: player_matchesCreateOrConnectWithoutMatchesInput | player_matchesCreateOrConnectWithoutMatchesInput[]
    upsert?: player_matchesUpsertWithWhereUniqueWithoutMatchesInput | player_matchesUpsertWithWhereUniqueWithoutMatchesInput[]
    createMany?: player_matchesCreateManyMatchesInputEnvelope
    set?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    disconnect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    delete?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    connect?: player_matchesWhereUniqueInput | player_matchesWhereUniqueInput[]
    update?: player_matchesUpdateWithWhereUniqueWithoutMatchesInput | player_matchesUpdateWithWhereUniqueWithoutMatchesInput[]
    updateMany?: player_matchesUpdateManyWithWhereWithoutMatchesInput | player_matchesUpdateManyWithWhereWithoutMatchesInput[]
    deleteMany?: player_matchesScalarWhereInput | player_matchesScalarWhereInput[]
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type matchesCreateWithoutPlayer_matchesInput = {
    match_date: Date | string
    team_a_score: number
    team_b_score: number
  }

  export type matchesUncheckedCreateWithoutPlayer_matchesInput = {
    id?: number
    match_date: Date | string
    team_a_score: number
    team_b_score: number
  }

  export type matchesCreateOrConnectWithoutPlayer_matchesInput = {
    where: matchesWhereUniqueInput
    create: XOR<matchesCreateWithoutPlayer_matchesInput, matchesUncheckedCreateWithoutPlayer_matchesInput>
  }

  export type matchesUpsertWithoutPlayer_matchesInput = {
    update: XOR<matchesUpdateWithoutPlayer_matchesInput, matchesUncheckedUpdateWithoutPlayer_matchesInput>
    create: XOR<matchesCreateWithoutPlayer_matchesInput, matchesUncheckedCreateWithoutPlayer_matchesInput>
    where?: matchesWhereInput
  }

  export type matchesUpdateToOneWithWhereWithoutPlayer_matchesInput = {
    where?: matchesWhereInput
    data: XOR<matchesUpdateWithoutPlayer_matchesInput, matchesUncheckedUpdateWithoutPlayer_matchesInput>
  }

  export type matchesUpdateWithoutPlayer_matchesInput = {
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
  }

  export type matchesUncheckedUpdateWithoutPlayer_matchesInput = {
    id?: IntFieldUpdateOperationsInput | number
    match_date?: DateTimeFieldUpdateOperationsInput | Date | string
    team_a_score?: IntFieldUpdateOperationsInput | number
    team_b_score?: IntFieldUpdateOperationsInput | number
  }

  export type player_matchesCreateWithoutMatchesInput = {
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
  }

  export type player_matchesUncheckedCreateWithoutMatchesInput = {
    id?: number
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
  }

  export type player_matchesCreateOrConnectWithoutMatchesInput = {
    where: player_matchesWhereUniqueInput
    create: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput>
  }

  export type player_matchesCreateManyMatchesInputEnvelope = {
    data: player_matchesCreateManyMatchesInput | player_matchesCreateManyMatchesInput[]
    skipDuplicates?: boolean
  }

  export type player_matchesUpsertWithWhereUniqueWithoutMatchesInput = {
    where: player_matchesWhereUniqueInput
    update: XOR<player_matchesUpdateWithoutMatchesInput, player_matchesUncheckedUpdateWithoutMatchesInput>
    create: XOR<player_matchesCreateWithoutMatchesInput, player_matchesUncheckedCreateWithoutMatchesInput>
  }

  export type player_matchesUpdateWithWhereUniqueWithoutMatchesInput = {
    where: player_matchesWhereUniqueInput
    data: XOR<player_matchesUpdateWithoutMatchesInput, player_matchesUncheckedUpdateWithoutMatchesInput>
  }

  export type player_matchesUpdateManyWithWhereWithoutMatchesInput = {
    where: player_matchesScalarWhereInput
    data: XOR<player_matchesUpdateManyMutationInput, player_matchesUncheckedUpdateManyWithoutMatchesInput>
  }

  export type player_matchesScalarWhereInput = {
    AND?: player_matchesScalarWhereInput | player_matchesScalarWhereInput[]
    OR?: player_matchesScalarWhereInput[]
    NOT?: player_matchesScalarWhereInput | player_matchesScalarWhereInput[]
    id?: IntFilter<"player_matches"> | number
    player_id?: IntFilter<"player_matches"> | number
    team?: StringNullableFilter<"player_matches"> | string | null
    goals?: IntNullableFilter<"player_matches"> | number | null
    result?: StringNullableFilter<"player_matches"> | string | null
    heavy_win?: BoolNullableFilter<"player_matches"> | boolean | null
    heavy_loss?: BoolNullableFilter<"player_matches"> | boolean | null
    match_id?: IntNullableFilter<"player_matches"> | number | null
  }

  export type player_matchesCreateManyMatchesInput = {
    id?: number
    player_id: number
    team?: string | null
    goals?: number | null
    result?: string | null
    heavy_win?: boolean | null
    heavy_loss?: boolean | null
  }

  export type player_matchesUpdateWithoutMatchesInput = {
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type player_matchesUncheckedUpdateWithoutMatchesInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type player_matchesUncheckedUpdateManyWithoutMatchesInput = {
    id?: IntFieldUpdateOperationsInput | number
    player_id?: IntFieldUpdateOperationsInput | number
    team?: NullableStringFieldUpdateOperationsInput | string | null
    goals?: NullableIntFieldUpdateOperationsInput | number | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    heavy_win?: NullableBoolFieldUpdateOperationsInput | boolean | null
    heavy_loss?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}