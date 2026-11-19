import { SchemaObject } from 'ajv';
import { gpsAddressPattern } from '../../helpers';
import { allAttributesConfig } from './dataFields';

/*
 * Typed as ajv's plain SchemaObject, not JSONSchemaType/SomeJSONSchema: those
 * typed-schema helpers only work with strictNullChecks, which this project's
 * tsconfig does not enable. ajv still validates the schemas when compiling them.
 */
export const fieldSchemaConfig: { [key in keyof typeof allAttributesConfig]?: SchemaObject} = {
    
    demolished_buildings:  {
        type: 'array',
        items: {
            type: 'object',
            required: ['year_constructed', 'year_demolished', 'overlap_present', 'links'],
            properties: {
                year_constructed: {
                    type: 'object',
                    required: ['min', 'max'],
                    additionalProperties: false,
                    properties: {
                        min: {
                            type: 'integer'
                        },
                        max: {
                            type: 'integer'
                        }
                    }
                },
                year_demolished: {
                    type: 'object',
                    required: ['min', 'max'],
                    additionalProperties: false,
                    properties: {
                        min: {
                            type: 'integer'
                        },
                        max: {
                            type: 'integer'
                        }
                    }
                },
                overlap_present: {
                    type: 'string',
                    enum: ['1%', '25%', '50%', '75%', '100%']
                },
                links: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    minItems: 1
                }
            },
            additionalProperties: false,
        }
    },

    community_type_worth_keeping_reasons: {
        type: 'object',
        properties: {
            external_design: {
                type: 'boolean',
                nullable: true
            },
            internal_design: {
                type: 'boolean',
                nullable: true
            },
            adaptable: {
                type: 'boolean',
                nullable: true
            },
            other: {
                type: 'boolean',
                nullable: true
            }
        },
        additionalProperties: false
    },

    // null clears the field; '' and non-strings are rejected (the edit form sends null for an emptied input)
    location_gps_address: {
        type: 'string',
        nullable: true,
        pattern: gpsAddressPattern
    }

} as const;
