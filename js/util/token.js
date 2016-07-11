'use strict';

module.exports = resolveTokens;

/**
 * Replace tokens in a string template with values in an object
 *
 * @param {Object} properties a key/value relationship between tokens and replacements
 * @param {string|Object} value a template string or substitution function object
 * @returns {string} the template with tokens replaced
 * @private
 */
function resolveTokens(properties, value) {
    if (typeof value === 'string') {
        return value.replace(/{([^{}]+)}/g, function(match, ref) {
            return ref in properties ? properties[ref] : '';
        });
    } else if (typeof value === 'object' && value.type === 'substitution') {
        var components = value.value;
        var text = '';
        for (var i = 0; i < components.length; i++) {
            var component = components[i];
            if (typeof component === 'string') {
                text += component;
            } else if (component.ref in properties) {
                text += properties[component.ref];
            } else if ('default' in component) {
                text += resolveTokens(properties, {
                    type: 'substitution',
                    value: [component.default]
                });
            }
        }
        return text;
    } else {
        return '';
    }
}
