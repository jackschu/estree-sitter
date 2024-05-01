export const type_mapping = new Map()

type_mapping.set('shorthand_property_identifier', 'Property')
type_mapping.set('shorthand_property_identifier_pattern', 'Property')

// one of the weirder ones, apparently object is the only valid parent of pair_pattern
type_mapping.set('pair', 'Property')
type_mapping.set('pair_pattern', 'Property')

type_mapping.set('template_string', 'TemplateLiteral')
type_mapping.set('property_identifier', 'Identifier')
type_mapping.set('rest_pattern', 'RestElement')
type_mapping.set('arrow_function', 'ArrowFunctionExpression')
type_mapping.set('statement_block', 'BlockStatement')
type_mapping.set('statement_identifier', 'Identifier')
type_mapping.set('object', 'ObjectExpression')
type_mapping.set('string', 'Literal')
type_mapping.set('number', 'Literal')
type_mapping.set('regex', 'Literal')

export const field_map = new Map()
field_map.set('new_expression', 'expression')
field_map.set('call_expression', 'expression')
field_map.set('constructor', 'callee')
field_map.set('function', 'callee')
