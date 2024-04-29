"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  DocumentFilter,
  ExtensionContext,
  languages,
  workspace
} from "vscode";

import { loadEditHelpers } from "./features/editHelpers";
import { Utils } from "./utils/utils";
import LogtalkDocumentHighlightProvider from "./features/documentHighlightProvider";
import LogtalkTerminal from "./features/logtalkTerminal";
import LogtalkLinter from "./features/logtalkLinter";
import LogtalkHoverProvider from "./features/hoverProvider";
import { LogtalkDeclarationProvider } from "./features/declarationProvider";
import { LogtalkDefinitionProvider } from "./features/definitionProvider";
import { LogtalkTypeDefinitionProvider } from "./features/typeDefinitionProvider";
import { LogtalkReferenceProvider } from "./features/referenceProvider";
import { LogtalkImplementationProvider } from "./features/implementationProvider";
import { LogtalkDocumentSymbolProvider } from "./features/goToDocumentSymbolProvider";
import { LogtalkWorkspaceSymbolProvider } from "./features/goToWorkspaceSymbolProvider";
import { LogtalkCallHierarchyProvider } from "./features/callHierarchyProvider";

const DEBUG = 1;

export function activate(context: ExtensionContext) {

  let subscriptions = context.subscriptions;
  DEBUG ? console.log('Congratulations, your extension "logtalk-for-vscode" is now active!') : null;

  const LOGTALK_MODE: DocumentFilter = { language: "logtalk", scheme: "file" };

  loadEditHelpers(subscriptions);
  const linter = new LogtalkLinter(context);
  linter.activate(subscriptions);

  DEBUG ? console.log('Linter Loaded.') : null;

  Utils.init(context);

  let logtalkCommands = [
    { command: "logtalk.load.directory",         callback: uri  => LogtalkTerminal.loadDirectory(uri, linter)},
    { command: "logtalk.load.file",              callback: uri  => LogtalkTerminal.loadFile(uri, linter)},
    { command: "logtalk.make.reload",            callback: async (uri)  => LogtalkTerminal.makeReload(uri)},
    { command: "logtalk.make.check",             callback: async (uri)  => LogtalkTerminal.makeCheck(uri)},
    { command: "logtalk.run.tests",              callback: uri  => LogtalkTerminal.runTests(uri)},
    { command: "logtalk.run.doclet",             callback: uri  => LogtalkTerminal.runDoclet(uri)},
    { command: "logtalk.scan.deadCode",          callback: uri  => LogtalkTerminal.scanForDeadCode(uri)},
    { command: "logtalk.generate.documentation", callback: uri  => LogtalkTerminal.genDocumentation(uri)},
    { command: "logtalk.generate.diagrams",      callback: uri  => LogtalkTerminal.genDiagrams(uri)},
    { command: "logtalk.open",                   callback: ()   => LogtalkTerminal.openLogtalk()},
    { command: "logtalk.run.testers",            callback: uri  => LogtalkTerminal.runTesters(uri)},
    { command: "logtalk.run.doclets",            callback: uri  => LogtalkTerminal.runDoclets(uri)},
    { command: "logtalk.goto.loaderFile",        callback: uri  => LogtalkTerminal.gotoLoaderFile(uri)}
  ];

  logtalkCommands.map(command => {
    context.subscriptions.push(
      commands.registerCommand(command.command, command.callback)
    );
  });

  context.subscriptions.push(
    languages.registerDocumentHighlightProvider(
      LOGTALK_MODE,
      new LogtalkDocumentHighlightProvider()
    )
  );
  context.subscriptions.push(
    languages.registerHoverProvider(LOGTALK_MODE, new LogtalkHoverProvider())
  );
  context.subscriptions.push(
    languages.registerDeclarationProvider(LOGTALK_MODE, new LogtalkDeclarationProvider())
  );
  context.subscriptions.push(
    languages.registerDefinitionProvider(LOGTALK_MODE, new LogtalkDefinitionProvider())
  );
  context.subscriptions.push(
    languages.registerTypeDefinitionProvider(LOGTALK_MODE, new LogtalkTypeDefinitionProvider())
  );
  context.subscriptions.push(
    languages.registerReferenceProvider(LOGTALK_MODE, new LogtalkReferenceProvider())
  );
  context.subscriptions.push(
    languages.registerImplementationProvider(LOGTALK_MODE, new LogtalkImplementationProvider())
  );
  context.subscriptions.push(
    languages.registerCallHierarchyProvider(LOGTALK_MODE, new LogtalkCallHierarchyProvider())
  );
  context.subscriptions.push(
    languages.registerDocumentSymbolProvider(LOGTALK_MODE, new LogtalkDocumentSymbolProvider())
  );
  context.subscriptions.push(
    languages.registerWorkspaceSymbolProvider(new LogtalkWorkspaceSymbolProvider( ))
  );
  context.subscriptions.push(LogtalkTerminal.init(context));
}
// this method is called when your extension is deactivated
export function deactivate() {}
