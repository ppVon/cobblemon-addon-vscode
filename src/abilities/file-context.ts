import * as ts from 'typescript';
import {
  type JsArrayNode,
  type JsObjectMember,
  type JsObjectNode,
  type JsValueNode,
  type ParsedJsObjectFile,
} from '../core/js-object';

export type AbilityObjectContextKind = 'top-level' | 'condition' | 'flags';

export interface AbilityObjectContext {
  readonly kind: AbilityObjectContextKind;
  readonly object: JsObjectNode;
  readonly path: readonly string[];
  readonly existingKeys: ReadonlySet<string>;
}

export function findAbilityObjectContext(
  parsed: ParsedJsObjectFile,
  offset: number,
): AbilityObjectContext | undefined {
  if (!parsed.root) {
    return undefined;
  }

  return findContextInObject(parsed, parsed.root, offset, []);
}

function findContextInObject(
  parsed: ParsedJsObjectFile,
  objectNode: JsObjectNode,
  offset: number,
  path: readonly string[],
): AbilityObjectContext | undefined {
  if (!nodeContainsOffset(parsed.sourceFile, objectNode.node, offset)) {
    return undefined;
  }

  for (const member of objectNode.members) {
    if (member.kind === 'method') {
      if (nodeContainsOffset(parsed.sourceFile, member.node, offset)) {
        return undefined;
      }
      continue;
    }

    if (member.kind !== 'property') {
      continue;
    }

    const nested = findContextInValue(parsed, member.value, offset, [
      ...path,
      member.key,
    ]);
    if (nested === 'blocked') {
      return undefined;
    }
    if (nested) {
      return nested;
    }
  }

  const kind = classifyAbilityContext(path);
  if (!kind) {
    return undefined;
  }

  return {
    kind,
    object: objectNode,
    path,
    existingKeys: new Set(
      objectNode.members
        .filter(
          (
            member,
          ): member is Exclude<JsObjectMember, { kind: 'unsupported-member' }> =>
            member.kind !== 'unsupported-member',
        )
        .map((member) => member.key),
    ),
  };
}

function findContextInValue(
  parsed: ParsedJsObjectFile,
  value: JsValueNode,
  offset: number,
  path: readonly string[],
): AbilityObjectContext | 'blocked' | undefined {
  if (value.kind === 'function') {
    return nodeContainsOffset(parsed.sourceFile, value.node, offset)
      ? 'blocked'
      : undefined;
  }

  if (value.kind === 'object') {
    return findContextInObject(parsed, value, offset, path);
  }

  if (value.kind === 'array') {
    return findContextInArray(parsed, value, offset, path);
  }

  return undefined;
}

function findContextInArray(
  parsed: ParsedJsObjectFile,
  arrayNode: JsArrayNode,
  offset: number,
  path: readonly string[],
): AbilityObjectContext | 'blocked' | undefined {
  if (!nodeContainsOffset(parsed.sourceFile, arrayNode.node, offset)) {
    return undefined;
  }

  for (const element of arrayNode.elements) {
    const nested = findContextInValue(parsed, element, offset, path);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function classifyAbilityContext(
  path: readonly string[],
): AbilityObjectContextKind | undefined {
  if (path.length === 0) {
    return 'top-level';
  }

  const last = path[path.length - 1];
  if (last === 'condition') {
    return 'condition';
  }
  if (last === 'flags') {
    return 'flags';
  }
  return undefined;
}

function nodeContainsOffset(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  offset: number,
): boolean {
  const start = node.getStart(sourceFile, false);
  return offset >= start && offset <= node.end;
}
