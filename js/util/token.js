'use strict';

module.exports = resolveStringValue;

/**
 * Replace tokens in a string template or selection function with values in an object
 *
 * @param {Object} properties a key/value relationship between tokens and replacements
 * @param {string|Object} value a template string or selection function object
 * @returns {string} the template with tokens replaced
 * @private
 */
function resolveStringValue(properties, value) {
    if (typeof value === 'string') {
        return value.replace(/{([^{}]+)}/g, function(match, ref) {
            return ref in properties ? properties[ref] : '';
        });
    } else if (typeof value === 'object' && value.type === 'selection') {
        var cases = value.cases;
        for (var i = 0; i < cases.length; i++) {
            var resolvedCase = resolveStringTemplate(properties, cases[i]);
            if (resolvedCase !== undefined) {
                return resolvedCase;
            }
        }
    }
    return '';
}

/**
 * Replace tokens in a structured string template with values in an object
 *
 * @param {Object} properties a key/value relationship between tokens and replacements
 * @param {Array<string|Object>} components an array of strings or token objects
 * @returns {string} the concatenated template with token objects replaced
 * @private
 */
function resolveStringTemplate(properties, components) {
    var text = '';
    for (var i = 0; i < components.length; i++) {
        var component = components[i];
        if (typeof component === 'string') {
            text += component;
        } else if (component.ref in properties) {
            text += properties[component.ref];
        } else {
            return;
        }
    }
    return text;
}
