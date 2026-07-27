/*
 * SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
 * SPDX-License-Identifier: MIT
 */

const fs = require('fs')
const path = require('path')
const {DOMParser} = require('@xmldom/xmldom')
const yaml = require('yaml')

/**
 * Names of the general entities the given source declares in an internal DTD
 * subset. `@xmldom/xmldom` never expands them, so a reference to one surfaces
 * as an "entity not found" error even though the entity is perfectly well
 * declared — DocBook and TEI stylesheets rely on exactly this. Knowing the
 * declared names lets the parser tell that recoverable case apart from a
 * genuinely undefined entity.
 * @param {string} str - XML source
 * @return {Set.<string>} - Declared general entity names
 */
const declaredEntities = function(str) {
  const names = new Set()
  for (const match of str.matchAll(/<!ENTITY\s+([A-Za-z_][\w.-]*)\s/g)) {
    names.add(match[1])
  }
  return names
}

/**
 * XML parser for the given source. Its error handler raises on any
 * well-formedness problem the parser reports — not only the fatal ones it
 * throws on, but also the recoverable ones such as an undefined entity — so a
 * not-well-formed document never parses, and keeps the parser's diagnostics
 * off the console. The one exception is a reference to an entity the source
 * itself declares: `@xmldom/xmldom` leaves internal-subset entities unexpanded,
 * and a declared-but-unexpanded entity is not a malformed document.
 * @param {string} str - XML source the parser will read
 * @return {DOMParser} - Configured parser
 */
const parserFor = function(str) {
  const declared = declaredEntities(str)
  return new DOMParser({
    onError: (level, message) => {
      const text = message.trim()
      const missing = text.match(/^entity not found:&(.+?);/)
      if (level !== 'warning' && !(missing && declared.has(missing[1]))) {
        throw new Error(text)
      }
    },
  })
}

/**
 * Get all the files recursively from given directory
 * @param {string} dir - Directory path
 * @return {Array.<string>} - Array of file in given directory
 */
const allFilesFrom = function(dir) {
  const files = fs.readdirSync(dir, {withFileTypes: true})
  const res = []
  for (const file of files) {
    if (file.isDirectory()) {
      res.push(...allFilesFrom(path.join(dir, file.name)))
    } else {
      res.push(path.resolve(dir, file.name))
    }
  }
  return res
}

/**
 * Read file content and parse it.
 * @param {string} type - Type of document
 * @param {function(string): *} fromString - Parser from string
 * @return {function(string): *} - Function that checks file and parses it
 */
const fromFile = function(type, fromString) {
  return function(path) {
    if (!fs.existsSync(path)) {
      throw new Error(`${type} file ${path} does not exist, can't parse`)
    }
    if (fs.statSync(path).isDirectory()) {
      throw new Error(`${type} file ${path} is directory, can't parse`)
    }
    return fromString(fs.readFileSync(path, 'utf-8'))
  }
}

/**
 * Parse XML from string.
 * @param {string} str - XML as string
 * @return {Document} - Parsed XML as Document
 */
const xmlFromString = function(str) {
  try {
    return parserFor(str).parseFromString(str, 'text/xml')
  } catch (err) {
    throw new Error(`Couldn't parse XML:\n${str}\n\nCause: ${err.message}`)
  }
}

/**
 * Parse YAML from string.
 * @param {string} str - YAML as string
 * @return {any} - Parses YAML
 */
const yamlFromString = function(str) {
  let parsed
  try {
    parsed = yaml.parse(str)
  } catch (err) {
    throw new Error(`Couldn't parse YAML:\n${str}\n\nCause: ${err.message}`)
  }
  return parsed
}

module.exports = {
  allFilesFrom,
  xml: {
    parsedFromFile: fromFile('XML', xmlFromString),
    parsedFromString: xmlFromString,
  },
  yaml: {
    parsedFromFile: fromFile('YAML', yamlFromString),
    parsedFromString: yamlFromString,
  },
}
