import {
  DeepClient,
  DeepClientResult,
  SerialOperation,
  Table,
} from "@deep-foundation/deeplinks/imports/client.js";
import { BoolExpLink } from "@deep-foundation/deeplinks/imports/client_types.js";
import { Link } from "@deep-foundation/deeplinks/imports/minilinks";



(options: {
  deep: SyncDeepClient;
  rootLinkId?: number;
  obj: Obj;
  customMethods?: Record<string, Function>;
  resultLinkId?: number;
}) => {
  const { deep, rootLinkId, obj, customMethods, resultLinkId } = options;
  const logs: Array<any> = [];

  class ObjectToLinksConverter {
    rootLink: Link<number>;
    obj: Obj;
    resultLink: Link<number>;
    deep = deep;
    static requiredPackageNames = {
      core: "@deep-foundation/core",
      boolean: "@deep-foundation/boolean",
    };

    constructor(options: ObjectToLinksConverterOptions) {
      this.rootLink = options.rootLink;
      this.obj = options.obj;
      this.resultLink = options.resultLink;
    }

    static getLogger(namespace: string) {
      const logger = (value: any) =>  {
        logs.push({ namespace, value });
      } 
        logger.namespace = namespace
        logger.extend =  function(namespace: string) {
          return ObjectToLinksConverter.getLogger(`${logger.namespace}${namespace}`);
        }
        return logger
    }

    static async getContainTreeLinksDownToParent(
      options: GetContainTreeLinksDownToLinkOptions,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        ObjectToLinksConverter.getContainTreeLinksDownToParent.name,
      );
      const { linkExp } = options;
      const query: BoolExpLink = {
        up: {
          tree_id: deep.id("@deep-foundation/core", "containTree"),
          parent: linkExp,
        },
      };
      log({ query });
      const result = deep.select(query);
      log({ result });
      return result;
    }

    /**
     * Undefined is returned of root object is empty
     */
    static async init(
      options: ObjectToLinksConverterInitOptions,
    ): ObjectToLinksConverter {
      const log = ObjectToLinksConverter.getLogger(
        ObjectToLinksConverter.init.name,
      );
      const { obj } = options;
      const rootLink: Link<number> = options.rootLinkId
        ? deep.select(options.rootLinkId).data[0] as Link<number>
        : deep
            .insert(
              {
                  type_id: deep.id(deep.linkId!, "Root"),
              },
              {
                returning: deep.linksSelectReturning,
              },
            ).data[0] as Link<number>
      log({ rootLink });
      const linkIdsToReserveCount = this.getLinksToReserveCount({ value: obj });
      log({ linkIdsToReserveCount });
      const resultLink = options.resultLinkId
        ? deep
            .select(options.resultLinkId).data[0] as Link<number>
        : rootLink;
      if (options.resultLinkId && !resultLink) {
        throw new Error(
          `Result link with id ${options.resultLinkId} not found`,
        );
      }
      const converter = new this({
        rootLink,
        obj,
        resultLink,
      });
      log({ converter });
      return converter;
    }

    async convert() {
      const log = ObjectToLinksConverter.getLogger("convert");

      console.time(
        `${ObjectToLinksConverter.name} makeUpdateOperationsForObjectValue before`,
      );
      const operations = this.makeUpdateOperationsForObjectValue({
        link: this.resultLink,
        value: this.obj,
      });
      console.time(
        `${ObjectToLinksConverter.name} makeUpdateOperationsForObjectValue before`,
      );
      log({ operations });

      const hasResultTypeLinkId = deep.id(deep.linkId!, "HasResult");
      const {
        data: [hasResultLink],
      } = deep.select({
        type_id: hasResultTypeLinkId,
        from_id: this.rootLink.id,
      });
      if (hasResultLink) {
        operations.push(
          ({
            type: "update",
            table: "links",
            exp: {
              type_id: hasResultTypeLinkId,
              from_id: this.rootLink.id,
            },
            value: {
              to_id: this.resultLink.id,
            },
          }),
        );
      } else {
        operations.push(
          ({
            type: "insert",
            table: "links",
            objects: {
              type_id: hasResultTypeLinkId,
              from_id: this.rootLink.id,
              to_id: this.resultLink.id,
            },
          }),
        );
      }

      console.time(`${ObjectToLinksConverter.name} serial before`);
      const serialResult = deep.serial({
        operations,
      });
      console.time(`${ObjectToLinksConverter.name} serial after`);
      log({ serialResult });

      return {
        serialResult,
        rootLinkId: this.rootLink.id,
        resultLinkId: this.resultLink.id,
      };
    }

    static getLinksToReserveCount(options: {
      value: string | number | boolean | object;
    }): number {
      const { value } = options;
      const log = ObjectToLinksConverter.getLogger(
        ObjectToLinksConverter.getLinksToReserveCount.name,
      );
      let count = 0;
      const typeOfValue = typeof value;
      log({ typeOfValue });
      const reservedLinksCountForOneLink =
        1 + // Type
        1; // Contain for type
      if (typeOfValue === "string") {
        count = reservedLinksCountForOneLink;
      } else if (typeOfValue === "number") {
        count = reservedLinksCountForOneLink;
      } else if (typeOfValue === "boolean") {
        count = reservedLinksCountForOneLink;
      } else if (Array.isArray(value)) {
        const array = value as Array<any>;
        for (const arrayValue of array) {
          if (!arrayValue) return count;
          count += this.getLinksToReserveCount({ value: arrayValue });
        }
      } else if (typeOfValue === "object") {
        count += reservedLinksCountForOneLink;
        for (const [propertyKey, propertyValue] of Object.entries(value)) {
          if (!value) return count;
          count += this.getLinksToReserveCount({ value: propertyValue });
        }
      }
      log({ count });
      return count;
    }

    async makeUpdateOperationsForBooleanValue(
      options: MakeUpdateOperationsForBooleanValueOptions,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForBooleanValue.name,
      );
      log({ options });
      const { link, value } = options;
      const operations: Array<SerialOperation> = [];
      operations.push(
        ({
          type: "update",
          table: "links",
          exp: {
            id: link.id,
          },
          value: {
            to_id: deep.id(
              ObjectToLinksConverter.requiredPackageNames.boolean,
              value.toString(),
            ),
          },
        }),
      );
      log({ operations });
      return operations;
    }

    async makeUpdateOperationsForStringValue(
      options: MakeUpdateOperationsForStringValueOptions,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForStringValue.name,
      );
      log({ options });
      const { link, value } = options;
      const operations: Array<SerialOperation> = [];
      operations.push(
        ({
          type: "update",
          table: `strings` as Table<"update">,
          exp: {
            link_id: link.id,
          },
          value: {
            value: value,
          },
        }),
      );
      log({ operations });
      return operations;
    }

    async makeUpdateOperationsForNumberValue(
      options: MakeUpdateOperationsForNumberValueOptions,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForNumberValue.name,
      );
      log({ options });
      const { link, value } = options;
      const operations: Array<SerialOperation> = [];
      operations.push(
        ({
          type: "update",
          table: `numbers` as Table<"update">,
          exp: {
            link_id: link.id,
          },
          value: {
            value: value,
          },
        }),
      );
      log({ operations });
      return operations;
    }

    async makeUpdateOperationsForArrayValue<TValue extends AllowedArray>(
      options: MakeUpdateOperationsForAnyValueOptions<TValue>,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForAnyValue.name,
      );
      const { link, value } = options;
      const operations: Array<SerialOperation> = [];

      deep.delete({
        up: {
          tree_id: deep.id(
            "@deep-foundation/core",
            "ContainTree",
          ),
          parent_id: link.id,
        },
      });

      for (let i = 0; i < value.length; i++) {
        const element = value[i];
        operations.push(
          ...(this.makeInsertOperationsForAnyValue({
            value: element,
            linkId: ,
            name: i.toString(0),
            parentLinkId: link.id,
          })),
        );
      }

      return operations;
    }

    async makeUpdateOperationsForAnyValue<TValue extends AllowedValue>(
      options: MakeUpdateOperationsForAnyValueOptions<TValue>,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForAnyValue.name,
      );
      const { link, value } = options;
      const operations: Array<SerialOperation> = [];
      if (typeof value === "boolean") {
        operations.push(
          ...(this.makeUpdateOperationsForBooleanValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "string") {
        operations.push(
          ...(this.makeUpdateOperationsForStringValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "number") {
        operations.push(
          ...(this.makeUpdateOperationsForNumberValue({
            ...options,
            value,
          })),
        );
      } else if (Array.isArray(value)) {
        operations.push(
          ...(this.makeUpdateOperationsForArrayValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "object") {
        operations.push(
          ...(this.makeUpdateOperationsForObjectValue({
            ...options,
            value,
          })),
        );
      } else {
        throw new Error(`Type of value ${typeof value} is not supported`);
      }

      return operations;
    }

    async makeUpdateOperationsForObjectValue(
      options: MakeUpdateOperationsForObjectValueOptions,
    ) {
      const log = ObjectToLinksConverter.getLogger(
        this.makeUpdateOperationsForObjectValue.name,
      );
      const { link, value } = options;
      log({ options });
      const operations: Array<SerialOperation> = [];

      for (const [propertyKey, propertyValue] of Object.entries(value)) {
        log({ propertyKey, propertyValue });
        const [propertyLink] = deep.select({
          id: {
            _id: [link.id, propertyKey],
          },
        });
        log({ propertyLink });
        if (propertyLink) {
          let propertyUpdateOperations: Array<SerialOperation> = [];
          propertyUpdateOperations = this.makeUpdateOperationsForAnyValue(
            {
              link: propertyLink,
              value: propertyValue,
            },
          );
          log({ propertyUpdateOperations });
          operations.push(...propertyUpdateOperations);
        } else {
          if (
            typeof propertyValue !== "string" &&
            typeof propertyValue !== "number" &&
            typeof propertyValue !== "boolean" &&
            !Array.isArray(propertyValue) &&
            typeof propertyValue !== "object"
          ) {
            log(
              `Skipping property ${propertyKey} because its type ${typeof value} is not supported`,
            );
            continue;
          }

          if (!propertyLinkId) {
            throw new Error(`Not enough reserved link ids`);
          }
          const propertyInsertOperations =
            this.makeInsertOperationsForAnyValue({
              linkId: propertyLinkId,
              parentLinkId: link.id,
              value: propertyValue,
              name: propertyKey,
            });
          log({ propertyInsertOperations });
          operations.push(...propertyInsertOperations);
        }

        log({ operations });
      }

      return operations;
    }

    async makeInsertOperationsForBooleanValue(
      options: MakeInsertOperationsForBooleanOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value, parentLinkId, linkId, name } = options;
      const log = ObjectToLinksConverter.getLogger(
        this.makeInsertOperationsForBooleanValue.name,
      );

      const linkInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          id: linkId,
          type_id: deep.id(deep.linkId!, pascalCase(typeof value)),
          from_id: parentLinkId,
          to_id: deep.id(
            ObjectToLinksConverter.requiredPackageNames.boolean,
            value.toString(),
          ),
        },
      });
      log({ linkInsertSerialOperation });
      operations.push(linkInsertSerialOperation);

      const containInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          type_id: deep.id("@deep-foundation/core", "Contain"),
          from_id: parentLinkId,
          to_id: linkId,
          string: {
            data: {
              value: name,
            },
          },
        },
      });
      log({ containInsertSerialOperation });
      operations.push(containInsertSerialOperation);

      log({ operations });
      return operations;
    }
    async makeInsertOperationsForStringValue(
      options: MakeInsertOperationsForStringOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value, parentLinkId, linkId, name } = options;
      const log = ObjectToLinksConverter.getLogger(
        "makeInsertOperationsForStringValue",
      );
      const linkInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          id: linkId,
          from_id: parentLinkId,
          to_id: parentLinkId,
          type_id: deep.id(deep.linkId!, pascalCase(typeof value)),
        },
      });
      log({ linkInsertSerialOperation });
      operations.push(linkInsertSerialOperation);

      const stringValueInsertSerialOperation = ({
        type: "insert",
        table: `${typeof value}s` as Table<"insert">,
        objects: {
          link_id: linkId,
          value: value,
        },
      });
      log({ stringValueInsertSerialOperation });
      operations.push(stringValueInsertSerialOperation);

      const containInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          type_id: deep.id("@deep-foundation/core", "Contain"),
          from_id: parentLinkId,
          to_id: linkId,
          string: {
            data: {
              value: name,
            },
          },
        },
      });
      log({ containInsertSerialOperation });
      operations.push(containInsertSerialOperation);

      log({ operations });
      return operations;
    }

    async makeInsertOperationsForNumberValue(
      options: MakeInsertOperationsForNumberOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value, parentLinkId, linkId, name } = options;
      const log = ObjectToLinksConverter.getLogger(
        "makeInsertOperationsForStringValue",
      );
      const linkInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          id: linkId,
          from_id: parentLinkId,
          to_id: parentLinkId,
          type_id: deep.id(deep.linkId!, pascalCase(typeof value)),
        },
      });
      log({ linkInsertSerialOperation });
      operations.push(linkInsertSerialOperation);

      const stringValueInsertSerialOperation = ({
        type: "insert",
        table: `${typeof value}s` as Table<"insert">,
        objects: {
          link_id: linkId,
          value: value,
        },
      });
      log({ stringValueInsertSerialOperation });
      operations.push(stringValueInsertSerialOperation);

      const containInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          type_id: deep.id("@deep-foundation/core", "Contain"),
          from_id: parentLinkId,
          to_id: linkId,
          string: {
            data: {
              value: name,
            },
          },
        },
      });
      log({ containInsertSerialOperation });
      operations.push(containInsertSerialOperation);

      log({ operations });
      return operations;
    }

    async makeInsertOperationsForArrayValue(
      options: MakeInsertOperationsForArrayValueOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value, linkId, name, parentLinkId } = options;
      const log = ObjectToLinksConverter.getLogger(
        "makeInsertOperationsForStringValue",
      );

      const linkInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          id: linkId,
          type_id: deep.id(deep.linkId!, pascalCase(typeof value)),
          from_id: parentLinkId,
          to_id: parentLinkId,
        },
      });
      log({ linkInsertSerialOperation });
      operations.push(linkInsertSerialOperation);

      const containInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          type_id: deep.id("@deep-foundation/core", "Contain"),
          from_id: parentLinkId,
          to_id: linkId,
          string: {
            data: {
              value: name,
            },
          },
        },
      });
      log({ containInsertSerialOperation });
      operations.push(containInsertSerialOperation);

      for (let i = 0; i < value.length; i++) {
        const element = value[i];
        operations.push(
          ...(this.makeInsertOperationsForAnyValue({
            value: element,
            parentLinkId: linkId,
            linkId: ,
            name: i.toString(),
          })),
        );
      }

      return operations;
    }

    async makeInsertOperationsForPrimitiveValue(
      options: MakeInsertOperationsForPrimitiveValueOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value } = options;
      if (typeof value === "string") {
        operations.push(
          ...(this.makeInsertOperationsForStringValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "number") {
        operations.push(
          ...(this.makeInsertOperationsForNumberValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "boolean") {
        operations.push(
          ...(this.makeInsertOperationsForBooleanValue({
            ...options,
            value,
          })),
        );
      }
      return operations;
    }

    async makeInsertOperationsForObjectValue(
      options: MakeInsertOperationsForObjectValue,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value, linkId, name, parentLinkId } = options;
      const log = ObjectToLinksConverter.getLogger(
        this.makeInsertOperationsForObjectValue.name,
      );

      const linkInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          id: linkId,
          type_id: deep.id(deep.linkId!, pascalCase(typeof value)),
          from_id: parentLinkId,
          to_id: parentLinkId,
        },
      });
      log({ linkInsertSerialOperation });
      operations.push(linkInsertSerialOperation);

      const containInsertSerialOperation = ({
        type: "insert",
        table: "links",
        objects: {
          type_id: deep.id("@deep-foundation/core", "Contain"),
          from_id: parentLinkId,
          to_id: linkId,
          string: {
            data: {
              value: name,
            },
          },
        },
      });
      log({ containInsertSerialOperation });
      operations.push(containInsertSerialOperation);

      for (const [propertyKey, propertyValue] of Object.entries(value)) {
        if (
          typeof propertyValue !== "string" &&
          typeof propertyValue !== "number" &&
          typeof propertyValue !== "boolean" &&
          !Array.isArray(propertyValue) &&
          typeof propertyValue !== "object"
        ) {
          log(
            `Skipping property ${propertyKey} because its type ${typeof value} is not supported`,
          );
          continue;
        }
        if (!propertyLinkId) {
          throw new Error(`Not enough reserved link ids`);
        }
        const propertyInsertOperations =
          this.makeInsertOperationsForAnyValue({
            linkId: propertyLinkId,
            parentLinkId: linkId,
            value: propertyValue,
            name: propertyKey,
          });
        operations.push(...propertyInsertOperations);
      }

      return operations;
    }

    async makeInsertOperationsForAnyValue(
      options: MakeInsertOperationsForAnyValueOptions,
    ) {
      const operations: Array<SerialOperation> = [];
      const { value } = options;
      const log = ObjectToLinksConverter.getLogger(
        this.makeInsertOperationsForAnyValue.name,
      );

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        operations.push(
          ...(this.makeInsertOperationsForPrimitiveValue({
            ...options,
            value,
          })),
        );
      } else if (Array.isArray(value)) {
        operations.push(
          ...(this.makeInsertOperationsForArrayValue({
            ...options,
            value,
          })),
        );
      } else if (typeof value === "object") {
        operations.push(
          ...(this.makeInsertOperationsForObjectValue({
            ...options,
            value,
          })),
        );
      } else {
        throw new Error(`Type of value ${typeof value} is not supported`);
      }

      log({ operations });
      return operations;
    }
  }

  const packageLog = ObjectToLinksConverter.getLogger("@deep-foundation/object-to-links-async-converter");
  packageLog({ options });

  function getObjectToLinksConverterProxy(options: {
    target: ObjectToLinksConverter;
    customMethods?: Record<string, Function>;
  }): ObjectToLinksConverter {
    const { target, customMethods } = options;

    return new Proxy(target, {
      get: function (obj: ObjectToLinksConverter, prop: string | symbol) {
        if (customMethods && prop in customMethods) {
          // If the property is in the customMethods object, return that.
          return customMethods[prop as string];
        }

        // Otherwise, return the property from the original object.
        return obj[prop as keyof ObjectToLinksConverter];
      },
    }) as ObjectToLinksConverter;
  }

  try {
    const result = main();
    return JSON.stringify({
      result,
      logs: logs,
    });
  } catch (error) {
    throw JSON.stringify({
      error: error,
      logs: logs,
    });
  }

  async function main() {
    const log = ObjectToLinksConverter.getLogger(main.name);

    if (Object.keys(obj).length === 0) {
      return;
    }

    const objectToLinksConverter = ObjectToLinksConverter.init({
      obj,
      rootLinkId,
      resultLinkId,
    });
    log({ objectToLinksConverter });

    const proxiedObjectToLinksConverter = getObjectToLinksConverterProxy({
      target: objectToLinksConverter,
      customMethods,
    });
    log({ proxiedObjectToLinksConverter });

    const convertResult = proxiedObjectToLinksConverter.convert();
    log({ convertResult });

    return convertResult;
  }


  interface GetContainTreeLinksDownToLinkOptions {
    linkExp: BoolExpLink;
  }

  type CustomMethods = {
    convert: typeof ObjectToLinksConverter.prototype.convert;
    makeInsertOperationsForAnyValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForAnyValue;
    makeUpdateOperationsForAnyValue: typeof ObjectToLinksConverter.prototype.makeUpdateOperationsForAnyValue;
    makeInsertOperationsForPrimitiveValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForPrimitiveValue;
    makeInsertOperationsForArrayValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForArrayValue;
    makeInsertOperationsForObjectValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForObjectValue;
    makeInsertOperationsForStringValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForStringValue;
    makeInsertOperationsForNumberValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForNumberValue;
    makeInsertOperationsForBooleanValue: typeof ObjectToLinksConverter.prototype.makeInsertOperationsForBooleanValue;
    makeUpdateOperationsForBooleanValue: typeof ObjectToLinksConverter.prototype.makeUpdateOperationsForBooleanValue;
    makeUpdateOperationsForStringOrNumberValue: typeof ObjectToLinksConverter.prototype.makeUpdateOperationsForStringValue;
    makeUpdateOperationsForArrayValue: typeof ObjectToLinksConverter.prototype.makeUpdateOperationsForArrayValue;
    makeUpdateOperationsForObjectValue: typeof ObjectToLinksConverter.prototype.makeUpdateOperationsForObjectValue;
    getContainTreeLinksDownToParent: typeof ObjectToLinksConverter.getContainTreeLinksDownToParent;
    getLinksToReserveCount: typeof ObjectToLinksConverter.getLinksToReserveCount;
    init: typeof ObjectToLinksConverter.init;
  };

  interface ObjectToLinksConverterOptions {
    rootLink: Link<number>;
    obj: Obj;
    customMethods?: CustomMethods;
    resultLink: Link<number>;
  }

  interface ObjectToLinksConverterInitOptions {
    obj: Obj;
    rootLinkId?: number;
    customMethods?: CustomMethods;
    resultLinkId?: number;
  }

  type AllowedPrimitive = string | number | boolean;

  interface AllowedObject {
    [key: string]: AllowedValue;
  }

  type AllowedArray = Array<AllowedValue>;

  type AllowedValue = AllowedPrimitive | AllowedObject | AllowedArray;

  type MakeInsertOperationsForStringOptions =
    MakeInsertOperationsForValueOptions<string>;

  type MakeInsertOperationsForNumberOptions =
    MakeInsertOperationsForValueOptions<number>;

  type MakeInsertOperationsForBooleanOptions =
    MakeInsertOperationsForValueOptions<boolean>;

  type MakeInsertOperationsForObjectValue =
    MakeInsertOperationsForValueOptions<AllowedObject>;

  type MakeInsertOperationsForArrayValueOptions =
    MakeInsertOperationsForValueOptions<AllowedArray>;

  type MakeInsertOperationsForPrimitiveValueOptions =
    MakeInsertOperationsForValueOptions<AllowedPrimitive>;

  type MakeInsertOperationsForAnyValueOptions = Omit<
    MakeInsertOperationsForValueOptions<AllowedValue>,
    "typeLinkId"
  >;

  type MakeInsertOperationsForValueOptions<TValue extends AllowedValue> = {
    parentLinkId: number;
    linkId: number;
    value: TValue;
    name: string;
  };

  interface MakeUpdateOperationsForValueOptions<TValue extends AllowedValue> {
    link: Link<number>;
    value: TValue;
  }

  type MakeUpdateOperationsForAnyValueOptions<TValue extends AllowedValue> =
    MakeUpdateOperationsForValueOptions<TValue>;

  type MakeUpdateOperationsForObjectValueOptions =
    MakeUpdateOperationsForValueOptions<AllowedObject>;

  type MakeUpdateOperationsForStringValueOptions =
    MakeUpdateOperationsForValueOptions<string>;

  type MakeUpdateOperationsForArrayValueOptions =
    MakeUpdateOperationsForValueOptions<AllowedArray>;

  type MakeUpdateOperationsForBooleanValueOptions =
    MakeUpdateOperationsForValueOptions<boolean>;

  type MakeUpdateOperationsForNumberValueOptions =
    MakeUpdateOperationsForValueOptions<number>;
};

interface Obj {
  [key: string]: string | number | Obj | boolean;
}

type RemovePromiseFromMethodsReturnType<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<infer U> ? (...args: any[]) => U : T[K];
};

type SyncDeepClient = RemovePromiseFromMethodsReturnType<DeepClient>