import type {
  API,
  ASTPath,
  File,
  FileInfo,
  Options,
  TSTypeParameterInstantiation,
  VariableDeclarator,
} from "jscodeshift";
import path from "path";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

const CONFIG_PATH_REGEX = /.*liveblocks(.*)?\.config(.*)?(\.(?:t|j)sx?)?/;
const FACTORIES_EXPORTS_REGEX = /^(Room|Liveblocks)?Provider|^use[A-Z]/;

type TSTypeKind = TSTypeParameterInstantiation["params"][0];

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  let isDirty = false;
  const isConfig = CONFIG_PATH_REGEX.test(path.basename(file.path));
  const withSuspense = (options as { suspense?: boolean }).suspense;
  let shouldUpdateDeclareGlobal = false;

  if (isConfig) {
    const removableFactoryImports: string[] = [];
    const globalTypes: {
      Presence: TSTypeKind | null;
      Storage: TSTypeKind | null;
      UserMeta: TSTypeKind | null;
      RoomEvent: TSTypeKind | null;
      ThreadMetadata: TSTypeKind | null;
    } = {
      Presence: null,
      Storage: null,
      UserMeta: null,
      RoomEvent: null,
      ThreadMetadata: null,
    };

    // Gather types from createRoomContext and createLiveblocksContext
    root.find(j.CallExpression).forEach((path) => {
      const isCreateRoomContext =
        path.node.callee.type === "Identifier" &&
        path.node.callee.name === "createRoomContext";
      const isCreateLiveblocksContext =
        path.node.callee.type === "Identifier" &&
        path.node.callee.name === "createLiveblocksContext";

      const typeParameters = (
        path.node as { typeParameters?: TSTypeParameterInstantiation }
      )?.typeParameters;

      if (isCreateRoomContext) {
        if (typeParameters) {
          // Presence
          if (
            typeParameters.params[0] &&
            typeParameters.params[0].type !== "TSNeverKeyword"
          ) {
            globalTypes.Presence = typeParameters.params[0];
          }

          // Storage
          if (
            typeParameters.params[1] &&
            typeParameters.params[1].type !== "TSNeverKeyword"
          ) {
            globalTypes.Storage = typeParameters.params[1];
          }

          // UserMeta
          if (
            typeParameters.params[2] &&
            typeParameters.params[2].type !== "TSNeverKeyword"
          ) {
            globalTypes.UserMeta = typeParameters.params[2];
          }

          // RoomEvent
          if (
            typeParameters.params[3] &&
            typeParameters.params[3].type !== "TSNeverKeyword"
          ) {
            globalTypes.RoomEvent = typeParameters.params[3];
          }

          // ThreadMetadata
          if (
            typeParameters.params[4] &&
            typeParameters.params[4].type !== "TSNeverKeyword"
          ) {
            globalTypes.ThreadMetadata = typeParameters.params[4];
          }
        }

        removableFactoryImports.push("createRoomContext");
      }

      if (isCreateLiveblocksContext) {
        if (typeParameters) {
          // UserMeta
          if (
            typeParameters.params[0] &&
            typeParameters.params[0].type !== "TSNeverKeyword"
          ) {
            globalTypes.UserMeta = typeParameters.params[0];
          }

          // ThreadMetadata
          if (
            typeParameters.params[1] &&
            typeParameters.params[1].type !== "TSNeverKeyword"
          ) {
            globalTypes.ThreadMetadata = typeParameters.params[1];
          }
        }

        removableFactoryImports.push("createLiveblocksContext");
      }

      // Remove createRoomContext and createLiveblocksContext calls
      if (isCreateRoomContext || isCreateLiveblocksContext) {
        const parentPath = path?.parentPath as ASTPath<VariableDeclarator>;

        if (parentPath?.value?.type === "VariableDeclarator") {
          j(parentPath).remove();

          isDirty = true;
        }
      }
    });

    // Remove createRoomContext and createLiveblocksContext imports
    if (removableFactoryImports.length > 0) {
      root
        .find(j.ImportDeclaration, { source: { value: "@liveblocks/react" } })
        .forEach((path) => {
          const importSpecifiers = path.node.specifiers;
          const remainingImports = importSpecifiers.filter(
            (specifier) =>
              !removableFactoryImports.includes(specifier.local.name)
          );

          if (remainingImports.length > 0) {
            const originalImport = j.importDeclaration(
              remainingImports,
              path.value.source
            );
            path.insertBefore(originalImport);
          }

          j(path).remove();

          isDirty = true;
        });
    }

    // Create global declaration
    if (Object.values(globalTypes).some((type) => type !== null)) {
      const intrface = j.tsInterfaceDeclaration(
        j.identifier("Liveblocks"),
        j.tsInterfaceBody([
          ...(globalTypes.Presence
            ? [
                j.tsPropertySignature(
                  j.identifier("Presence"),
                  j.tsTypeAnnotation(globalTypes.Presence)
                ),
              ]
            : []),
          ...(globalTypes.Storage
            ? [
                j.tsPropertySignature(
                  j.identifier("Storage"),
                  j.tsTypeAnnotation(globalTypes.Storage)
                ),
              ]
            : []),
          ...(globalTypes.UserMeta
            ? [
                j.tsPropertySignature(
                  j.identifier("UserMeta"),
                  j.tsTypeAnnotation(globalTypes.UserMeta)
                ),
              ]
            : []),
          ...(globalTypes.RoomEvent
            ? [
                j.tsPropertySignature(
                  j.identifier("RoomEvent"),
                  j.tsTypeAnnotation(globalTypes.RoomEvent)
                ),
              ]
            : []),
          ...(globalTypes.ThreadMetadata
            ? [
                j.tsPropertySignature(
                  j.identifier("ThreadMetadata"),
                  j.tsTypeAnnotation(globalTypes.ThreadMetadata)
                ),
              ]
            : []),
        ])
      );

      intrface.comments = [
        j.commentLine(
          " For more information, see https://liveblocks.io/docs/api-reference/liveblocks-client#TypeScript"
        ),
      ];

      // HACK: It's not possible to generate a `declare global` block, so we generate a `declare module global` block instead and later find-and-replace it
      const globalDeclaration = j.declareModule(
        j.identifier("global"),
        j.blockStatement([intrface])
      );

      (root.get() as ASTPath<File>).node.program.body.push(globalDeclaration);

      shouldUpdateDeclareGlobal = true;
      isDirty = true;
    }

    // Clean up exported values
    root.find(j.ExportNamedDeclaration).forEach((path) => {
      path.node.specifiers = path.node.specifiers.filter(
        (specifier) => !FACTORIES_EXPORTS_REGEX.test(specifier.exported.name)
      );
    });

    // Clean up `export {}`
    root.find(j.ExportNamedDeclaration).forEach((path) => {
      if (path.node.specifiers.length === 0 && !path.node.declaration) {
        j(path).remove();

        isDirty = true;
      }
    });

    // If file is no longer a module, add a single `export {}`
    const hasImports = root.find(j.ImportDeclaration).length > 0;
    const hasExports =
      root.find(j.ExportNamedDeclaration).length > 0 ||
      root.find(j.ExportDefaultDeclaration).length > 0 ||
      root.find(j.ExportAllDeclaration).length > 0;

    if (!hasImports && !hasExports) {
      (root.get() as ASTPath<File>).node.program.body.push(
        j.exportNamedDeclaration(null, [])
      );

      isDirty = true;
    }
  } else {
    /**
     * Before: import { RoomProvider } from "./liveblocks.config"
     *  After: import { RoomProvider } from "@liveblocks/react"
     */
    root
      .find(j.ImportDeclaration)
      .filter((path) => {
        return (
          path.value.source.type === "StringLiteral" &&
          CONFIG_PATH_REGEX.test(path.value.source.value)
        );
      })
      .forEach((path) => {
        const importSpecifiers = path.node.specifiers;
        const importsFromLiveblocksReact = importSpecifiers.filter(
          (specifier) => FACTORIES_EXPORTS_REGEX.test(specifier.local.name)
        );
        const importsFromConfig = importSpecifiers.filter(
          (specifier) => !FACTORIES_EXPORTS_REGEX.test(specifier.local.name)
        );

        if (importsFromLiveblocksReact.length > 0) {
          const liveblocksReactImport = j.importDeclaration(
            importsFromLiveblocksReact,
            j.stringLiteral(
              withSuspense ? "@liveblocks/react/suspense" : "@liveblocks/react"
            )
          );
          path.insertBefore(liveblocksReactImport);
        }

        if (importsFromConfig.length > 0) {
          const originalImport = j.importDeclaration(
            importsFromConfig,
            path.value.source
          );
          path.insertBefore(originalImport);
        }

        j(path).remove();

        isDirty = true;
      });
  }

  const ouput = isDirty ? root.toSource(options) : file.source;

  if (shouldUpdateDeclareGlobal) {
    return ouput.replace("declare module global", "declare global");
  } else {
    return ouput;
  }
}
