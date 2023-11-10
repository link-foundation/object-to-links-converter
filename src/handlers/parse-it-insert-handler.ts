import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { Link } from "@deep-foundation/deeplinks/imports/minilinks.js";
import { DeepClientInstance } from "@deep-foundation/deeplinks/imports/client";
import { RemovePromiseFromMethodsReturnType } from "../RemovePromiseFromMethodsReturnType";

(options: {
  deep: RemovePromiseFromMethodsReturnType<DeepClientInstance>;
  data: {
    newLink: Link<number>;
  };
}) => {
  const {
    deep,
    data: { newLink: parseItLink },
  } = options;
  try {
    const result = main();
    return {
      result: JSON.stringify(result),
    };
  } catch (error) {
    console.log("FreePhoenix error");
    console.dir({
      error: JSON.stringify(error),
    });
    throw {
      error: JSON.stringify(error),
    };
  }

  function main() {
    const {
      data: rootLinkSelectData,
    } = deep.select({
      id: parseItLink.from_id,
    });
    const rootLink = rootLinkSelectData[0] as Link<number>;
    if (!rootLink) {
      throw new Error(`parseIt.to does not exist: ##${parseItLink.from_id}`);
    }

    let obj;
    if (typeof rootLink.value?.value === "object") {
      obj = rootLink.value?.value;
    } else if (typeof rootLink.value?.value === "string") {
      try {
        obj = JSON.parse(rootLink.value?.value);
      } catch (error) {
        throw new Error(
          `##${rootLink.id} must be valid JSON if it is a string`,
        );
      }
    } else {
      throw new Error(`##${rootLink.id} must have value`);
    }
    if (!obj) {
      throw new Error(`##${rootLink.id} must have value`);
    }

    const clientHandlerResult = callClientHandler({
      deep,
      linkId: deep.id(deep.linkId!, "clientHandler"),
      args: [
        {
          deep: deep,
          obj: obj,
          rootLinkId: rootLink.id,
          resultLinkId: parseItLink.to_id,
          // TODO?
          // customMethods: options.customMethods,
        },
      ],
    });

    return clientHandlerResult;
  }

  function callClientHandler(
    options: CallClientHandlerOptions,
  ): any {
    const { linkId, deep, args } = options;
    const { data: selectData } = deep.select({
      in: {
        id: linkId,
      },
    });
  
    const link = selectData[0] as Link<number>;
    if (!link) throw new Error(`Unable to find SyncTextFile for ##${linkId}`);
  
    const functionExpressionString = link.value?.value;
    if (!functionExpressionString) throw new Error(`##${link.id} must have value`);
  
    const fn: Function = eval(functionExpressionString);
  
    const result = fn(...args);
    return result;
  }

  interface CallClientHandlerOptions {
    deep: RemovePromiseFromMethodsReturnType<DeepClientInstance>;
    linkId: number;
    args: Array<any>;
  }
};
