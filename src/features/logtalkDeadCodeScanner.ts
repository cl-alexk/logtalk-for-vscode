"use strict";

import {
  CancellationToken,
  CodeActionContext,
  CodeActionProvider,
  Command,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  ExtensionContext,
  languages,
  OutputChannel,
  Position,
  Range,
  Selection,
  TextDocument,
  TextEditorRevealType,
  Uri,
  window,
  workspace,
  WorkspaceEdit
} from "vscode";
import * as path from "path";

import LogtalkTerminal from "./logtalkTerminal"; 

export default class LogtalkDeadCodeScanner implements CodeActionProvider {

  public  diagnosticCollection: DiagnosticCollection;
  public  diagnostics: { [docName: string]: Diagnostic[] } = {};
  public  diagnosticHash = [];
  private filePathIds: { [id: string]: string } = {};
  private sortedDiagIndex: { [docName: string]: number[] } = {};
  private msgRegex = /(((\*|\!)\s{5}.+\n[\*|\!]\s{7}.+\n)|((\*|\!)\s{5}.+\n))[\*|\!]\s{7}.+\n[\*|\!]\s{7}in file\s(.+)\s((at or above line\s(\d+))|(between lines\s(\d+)[-](\d+))|(at line\s(\d+)))/;
  private executable: string;
  private documentListener: Disposable;
  private openDocumentListener: Disposable;
  public  outputChannel: OutputChannel = null;

  constructor(private context: ExtensionContext) {
    this.executable = null;
    this.loadConfiguration();
  }

  provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    token: CancellationToken
  ): Command[] | Thenable<Command[]> {
    let codeActions: Command[] = [];
    return codeActions;
  }
  private parseIssue(issue: string) {

    if(this.diagnosticHash.includes(issue)) {
      return true
    } else {
      this.diagnosticHash.push(issue)
    }

    let match = issue.match(this.msgRegex)
    if (match == null) { return null; }

    let severity: DiagnosticSeverity;
    if(match[0][0] == '*') {
      severity = DiagnosticSeverity.Warning
    } else {
      severity = DiagnosticSeverity.Error
    } 

    let fileName = path.resolve(match[6]);
    console.log(fileName);
    let lineFrom = 0,
        lineTo   = 0;
        console.log(match)

    if(match[9]) {
      lineFrom = parseInt(match[9])-1;
      lineTo   = parseInt(match[9])-1;
    } else if(match[14]) {
      lineFrom = parseInt(match[14])-1;
      lineTo   = parseInt(match[14])-1;
    } else {
      lineFrom = parseInt(match[11])-1
      lineTo   = parseInt(match[12])-1
    }

    let fromCol = 0;
    let toCol = 240; // Default horizontal range
    let fromPos = new Position(lineFrom, fromCol);
    let toPos = new Position(lineTo, toCol);
    let range = new Range(fromPos, toPos);
    let errMsg = match[1].replace(new RegExp(/\*     /,'g'), '').replace(new RegExp(/\!     /,'g'), '');
    let diag = new Diagnostic(range, errMsg, severity);

    if (diag) {
      if (!this.diagnostics[fileName]) {
        this.diagnostics[fileName] = [diag];
      } else {
          this.diagnostics[fileName].push(diag);
      }
    }

  }

  public lint(textDocument: TextDocument, message) {
    this.parseIssue(message);
    this.diagnosticCollection.delete(textDocument.uri);
    
    for (let doc in this.diagnostics) {
      let index = this.diagnostics[doc]
        .map((diag, i) => {
          return [diag.range.start.line, i];
        })
        .sort((a, b) => {
          return a[0] - b[0];
        });
      this.sortedDiagIndex[doc] = index.map(item => {
        return item[1];
      });
      this.diagnosticCollection.set(Uri.file(doc), this.diagnostics[doc]);
    }
    for (let doc in this.sortedDiagIndex) {
      let si = this.sortedDiagIndex[doc];
      for (let i = 0; i < si.length; i++) {
        let diag = this.diagnostics[doc][si[i]];
        let severity = diag.severity === DiagnosticSeverity.Error ? "ERROR" : "Warning";
        this.outputChannel.append(message)
      }
      if (si.length > 0) {
        this.outputChannel.show(true);
      }
    }
  }

  private loadConfiguration(): void {
    let section = workspace.getConfiguration("logtalk");
    if (section) {
      this.executable = section.get<string>("executable.path", "logtalk");
      if (this.documentListener) {
        this.documentListener.dispose();
      }
      if (this.openDocumentListener) {
        this.openDocumentListener.dispose();
      }
    }
  }

  public activate(subscriptions): void {

    this.diagnosticCollection = languages.createDiagnosticCollection('Logtalk Dead Code Scanner');

    workspace.onDidChangeConfiguration(
      this.loadConfiguration,
      this,
      subscriptions
    );
    
    if (this.outputChannel === null) {
      this.outputChannel = window.createOutputChannel("Logtalk Dead Code Scanner");
      this.outputChannel.clear();
    }

    this.loadConfiguration();

    // workspace.onDidOpenTextDocument(this.doPlint, this, subscriptions);
    workspace.onDidCloseTextDocument(
      textDocument => {
        this.diagnosticCollection.delete(textDocument.uri);
      },
      null,
      subscriptions
    );
  }

  private outputMsg(msg: string) {
    this.outputChannel.append(msg + "\n");
    this.outputChannel.show(true);
  }

  public dispose(): void {
    this.documentListener.dispose();
    this.openDocumentListener.dispose();
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
  }

}
