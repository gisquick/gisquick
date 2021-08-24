const Pofile = require('pofile');


/**
 * sanitizePoData
 *
 * Returns a sanitized po data dictionary where:
 * - no fuzzy or obsolete strings are returned
 * - no empty translations are returned
 *
 * @argument poItems: Object, items from the PO catalog
 *
 * @returns jsonData: Object, sanitized PO data
 *
 * {
 *   "Hello World": "Bonjour monde",
 *   "Thank you": {
 *     "à ma mère": "Merci, m'man",
 *     "à mon patron": "Je vous remercie",
 *   }
 * }
 */
function sanitizePoData(poItems) {
  const messages = {};

  for (let item of poItems) {
    const ctx = item.msgctxt || '';
    if (item.msgstr[0] && item.msgstr[0].length > 0 && !item.flags.fuzzy && !item.obsolete) {
      if (!messages[item.msgid]) {
        messages[item.msgid] = {};
      }
      // Add an array for plural, a single string for singular.
      messages[item.msgid][ctx] = item.msgstr.length === 1 ? item.msgstr[0] : item.msgstr;
    }
  }

  // Strip context from messages that have no context.
  for (let key in messages) {
    if (Object.keys(messages[key]).length === 1 && messages[key]['']) {
      messages[key] = messages[key][''];
    }
  }
  return messages;
}


function po2json(poContent) {
  const catalog = Pofile.parse(poContent);
  if (!catalog.headers.Language) {
    throw new Error('No Language headers found!');
  }
  return {
    headers: catalog.headers,
    messages: sanitizePoData(catalog.items),
  };
}

module.exports = {
  sanitizePoData,
  po2json,
};
