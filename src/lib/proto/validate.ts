/**
 * validate.ts — shared protovalidate validator.
 *
 * protobuf is the single wire format for the Kyanite backend (see
 * facet-architecture.md). Messages decoded from NATS (and, later, ConnectRPC)
 * are validated against their `buf.validate` constraints with protovalidate
 * before the UI trusts them.
 *
 * Generated message schemas come from the `@kyanite/schema` package
 * (protoc-gen-es output, `include_imports` so the buf.validate rules are
 * compiled into the descriptors). Usage:
 *
 *   import { getValidator } from "$lib/proto/validate";
 *   import { SensorReadingSchema } from "@kyanite/schema/schema/v1/sensor_pb";
 *   const result = getValidator().validate(SensorReadingSchema, message);
 *   if (result.kind !== "valid") { ...handle result.violations... }
 */

import { createValidator, type Validator } from "@bufbuild/protovalidate";

let validator: Validator | undefined;

/**
 * Returns the process-wide protovalidate validator, created lazily. Reusing one
 * instance amortises CEL compilation across validations.
 */
export function getValidator(): Validator {
	validator ??= createValidator();
	return validator;
}
