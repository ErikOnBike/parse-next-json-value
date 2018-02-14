module.exports = (function JSONParser() {

	var HEX_STRING_LENGTH = 4;

	var CHARACTERS = {
		SPACE: 0x20,
		BACKSPACE: 0x08,
		TAB: 0x09,
		CARRIAGE_RETURN: 0x0d,
		LINE_FEED: 0x0a,
		FORM_FEED: 0x0c,
		DOUBLE_QUOTE: 0x22,
		COMMA: 0x2c,
		COLON: 0x3a,
		CURLY_BRACE_OPEN: 0x7b,
		CURLY_BRACE_CLOSE: 0x7d,
		SQUARE_BRACKET_OPEN: 0x5b,
		SQUARE_BRACKET_CLOSE: 0x5d,
		ESCAPE: 0x5c,
		SOLIDUS: 0x2f,
		REVERSE_SOLIDUS: 0x5c,
		MINUS: 0x2d,
		PLUS: 0x2b,
		ZERO: 0x30,
		ONE: 0x31,
		NINE: 0x39,
		POINT: 0x2e,
		UPPER_A: 0x41,
		UPPER_E: 0x45,
		UPPER_F: 0x46,
		LOWER_A: 0x61,
		LOWER_B: 0x62,
		LOWER_E: 0x65,
		LOWER_F: 0x66,
		LOWER_N: 0x6e,
		LOWER_R: 0x72,
		LOWER_T: 0x74,
		LOWER_U: 0x75

	};

	var states = {
		"start": {
			acceptStates: [
				function() {
					return "value";
				}
			]
		},
		"value": {
			skipWhitespace: true,
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.CURLY_BRACE_OPEN) {
						skipCharacter(context);
						return "begin-object";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.SQUARE_BRACKET_OPEN) {
						skipCharacter(context);
						return "begin-array";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.DOUBLE_QUOTE) {
						skipCharacter(context);
						return "begin-string";
					}
				},
				function(charCode) {
					if(charCode === CHARACTERS.MINUS || isDigit(charCode)) {
						return "begin-number";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_T) {
						if(skipString("true", context)) {
							setValue(true, context);
							return "end-literal";
						}
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_F) {
						if(skipString("false", context)) {
							setValue(false, context);
							return "end-literal";
						}
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_N) {
						if(skipString("null", context)) {
							setValue(null, context);
							return "end-literal";
						}
					}
				}
			],
			errorCode: "MISSING_VALUE"
		},
		"begin-object": {
			skipWhitespace: true,
			process: function(context) {
				setValue({}, context);
				return true;
			},
			acceptStates: [
				function() {
					return "member";
				}
			]
		},
		"end-object": {
			skipWhitespace: true,
			isFinal: true
		},
		"member": {
			skipWhitespace: true,
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.CURLY_BRACE_CLOSE) {
						skipCharacter(context);
						return "end-object";
					}
				},
				function(charCode) {
					if(charCode === CHARACTERS.DOUBLE_QUOTE) {
						return "member-name";
					}
				}
			],
			errorCode: "MISSING_MEMBER_NAME"
		},
		"member-name": {
			process: function(context) {

				// A string should be present as member name
				var parseResult = parseJSON(context);
				if(parseResult.value !== undefined) {
					objectValueAddMember(parseResult.value, context);
					return true;
				}

				return "INVALID_MEMBER_NAME";
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.COLON) {
						skipCharacter(context);
						return "member-value";
					}
				}
			],
			errorCode: "MISSING_COLON"
		},
		"member-value": {
			process: function(context) {

				// A value should be present as member value
				var parseResult = parseJSON(context);
				if(parseResult.value !== undefined) {
					objectValueAssignMemberValue(parseResult.value, context);
					return true;
				}

				return parseResult.errorCode;
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.CURLY_BRACE_CLOSE) {
						skipCharacter(context);
						return "end-object";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.COMMA) {
						skipCharacter(context);
						return "member";
					}
				}
			],
			errorCode: "INVALID_OBJECT"
		},
		"begin-array": {
			skipWhitespace: true,
			process: function(context) {
				setValue([], context);
				return true;
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.SQUARE_BRACKET_CLOSE) {
						skipCharacter(context);
						return "end-array";
					}
				},
				function() {
					return "array-element";
				}
			],
		},
		"end-array": {
			skipWhitespace: true,
			isFinal: true
		},
		"array-element": {
			process: function(context) {

				// A value should be present as array element
				var parseResult = parseJSON(context);
				if(parseResult.value !== undefined) {
					arrayValuePush(parseResult.value, context);
					return true;
				}

				return parseResult.errorCode;
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.SQUARE_BRACKET_CLOSE) {
						skipCharacter(context);
						return "end-array";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.COMMA) {
						skipCharacter(context);
						return "array-element";
					}
				}
			],
			errorCode: "INVALID_ARRAY"
		},
		"begin-string": {
			process: function(context) {
				setValue("", context);
				return true;
			},
			acceptStates: [
				function() {
					return "string-char";
				}
			]
		},
		"end-string": {
			skipWhitespace: true,
			isFinal: true
		},
		"string-char": {
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.DOUBLE_QUOTE) {
						skipCharacter(context);
						return "end-string";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.ESCAPE) {
						skipCharacter(context);
						return "string-escaped-char";
					}
				},
				function(charCode, context) {
					if(charCode > 0x001f) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "string-char";
					}
				}
			],
			errorCode: "INVALID_STRING"
		},
		"string-escaped-char": {
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.DOUBLE_QUOTE) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.REVERSE_SOLIDUS) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.SOLIDUS) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_N) {
						skipCharacter(context);
						stringValueAppendCharCode(CHARACTERS.LINE_FEED, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_R) {
						skipCharacter(context);
						stringValueAppendCharCode(CHARACTERS.CARRIAGE_RETURN, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_T) {
						skipCharacter(context);
						stringValueAppendCharCode(CHARACTERS.TAB, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_B) {
						skipCharacter(context);
						stringValueAppendCharCode(CHARACTERS.BACKSPACE, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_F) {
						skipCharacter(context);
						stringValueAppendCharCode(CHARACTERS.FORM_FEED, context);
						return "string-char";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_U) {
						skipCharacter(context);
						return "string-unicode-char";
					}
				}
			],
			errorCode: "INVALID_ESCAPE_CHAR"
		},
		"string-unicode-char": {
			acceptStates: [
				function(charCode, context) {
					var hexString = skipHexString(context);
					if(hexString) {
						var unicodeCharCode = parseInt(hexString, 16);
						stringValueAppendCharCode(unicodeCharCode, context);
						return isLowSurrogate(unicodeCharCode) ? "string-high-surrogate" : "string-char";
					}
				}
			],
			errorCode: "INVALID_UNICODE_HEX_STRING"
		},
		"string-high-surrogate": {
			acceptStates: [
				function(charCode, context) {
					var hexString = skipUnicodeHexString(context);
					if(hexString) {
						var unicodeCharCode = parseInt(hexString, 16);
						if(isHighSurrogate(unicodeCharCode)) {
							stringValueAppendCharCode(unicodeCharCode, context);
							return "string-char";
						}
					}
				}
			],
			errorCode: "MISSING_HIGH_SURROGATE"
		},
		"begin-number": {
			process: function(context) {
				setValue("", context);
				return true;
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.MINUS) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number";
					}
				},
				function() {
					return "number";
				}
			],
		},
		"number": {
			acceptStates: [
				function(charCode) {
					if(charCode === CHARACTERS.ZERO) {
						return "number-starting-0";
					}
				},
				function(charCode) {
					if(isNonZeroDigit(charCode)) {
						return "number-integer";
					}
				}
			],
			errorCode: "INVALID_NUMBER"
		},
		"end-number": {
			skipWhitespace: true,
			process: function(context) {
				stringValueConvertToNumber(context);
				return true;
			},
			isFinal: true
		},
		"number-starting-0": {
			process: function(context) {
				skipCharacter(context);
				stringValueAppendCharCode(CHARACTERS.ZERO, context);
				return true;
			},
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.POINT) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-fraction";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_E || charCode === CHARACTERS.UPPER_E) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"number-integer": {
			acceptStates: [
				function(charCode, context) {
					if(isDigit(charCode)) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number-integer";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.POINT) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-fraction";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_E || charCode === CHARACTERS.UPPER_E) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"begin-number-fraction": {
			acceptStates: [
				function(charCode, context) {
					if(isDigit(charCode)) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number-fraction";
					}
				}
			],
			errorCode: "INVALID_NUMBER_FRACTION"
		},
		"number-fraction": {
			acceptStates: [
				function(charCode, context) {
					if(isDigit(charCode)) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number-fraction";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.LOWER_E || charCode === CHARACTERS.UPPER_E) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"begin-number-exponent": {
			acceptStates: [
				function(charCode, context) {
					if(charCode === CHARACTERS.MINUS) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-exponent-digits";
					}
				},
				function(charCode, context) {
					if(charCode === CHARACTERS.PLUS) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "begin-number-exponent-digits";
					}
				},
				function(charCode) {
					if(isDigit(charCode)) {
						return "number-exponent-digits";
					}
				}
			],
			errorCode: "INVALID_NUMBER_EXPONENT"
		},
		"begin-number-exponent-digits": {
			acceptStates: [
				function(charCode, context) {
					if(isDigit(charCode)) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number-exponent-digits";
					}
				}
			],
			errorCode: "INVALID_NUMBER_EXPONENT"
		},
		"number-exponent-digits": {
			acceptStates: [
				function(charCode, context) {
					if(isDigit(charCode)) {
						skipCharacter(context);
						stringValueAppendCharCode(charCode, context);
						return "number-exponent-digits";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"end-literal": {
			skipWhitespace: true,
			isFinal: true
		}
	};

	function isDigit(charCode) {
		return charCode >= CHARACTERS.ZERO && charCode <= CHARACTERS.NINE;
	}
	function isNonZeroDigit(charCode) {
		return charCode >= CHARACTERS.ONE && charCode <= CHARACTERS.NINE;
	}
	function isHexDigit(charCode) {
		return isDigit(charCode) ||
			(charCode >= CHARACTERS.LOWER_A && charCode <= CHARACTERS.LOWER_F) ||
			(charCode >= CHARACTERS.UPPER_A && charCode <= CHARACTERS.UPPER_F)
		;
	}
	function isWhitespace(charCode) {
		return	charCode === CHARACTERS.SPACE ||
			charCode === CHARACTERS.LINE_FEED ||
			charCode === CHARACTERS.CARRIAGE_RETURN ||
			charCode === CHARACTERS.TAB
		;
	}
	function isLowSurrogate(charCode) {
		return charCode >= 0xd800 && charCode <= 0xdbff;
	}
	function isHighSurrogate(charCode) {
		return charCode >= 0xdc00 && charCode <= 0xdfff;
	}
	function newContext(string, index) {
		return {
			valueStack: [],
			string: string,
			index: index || 0,
			length: string.length
		};
	}
	function setValue(value, context) {
		var valueStack = context.valueStack;
		valueStack[valueStack.length - 1] = value;
	}
	function stringValueAppendCharCode(charCode, context) {
		var valueStack = context.valueStack;
		valueStack[valueStack.length - 1] += String.fromCharCode(charCode);
	}
	function stringValueConvertToNumber(context) {
		var valueStack = context.valueStack;
		valueStack[valueStack.length - 1] = parseFloat(valueStack[valueStack.length - 1]);
	}
	function arrayValuePush(value, context) {
		var valueStack = context.valueStack;
		valueStack[valueStack.length - 1].push(value);
	}
	function objectValueAddMember(name, context) {
		var valueStack = context.valueStack;
		valueStack[valueStack.length - 1][name] = undefined;
	}
	function objectValueAssignMemberValue(value, context) {
		var valueStack = context.valueStack;
		var objectValue = valueStack[valueStack.length - 1];

		// Iterate over all members finding the unassigned one (should be last in order of Object.keys())
		Object.keys(objectValue).reverse().some(function(name) {
			/* istanbul ignore next */
			if(objectValue[name] === undefined) {
				objectValue[name] = value;
				return true;
			}
			/* istanbul ignore next */
			return false;
		});
	}
	function getCharCode(context) {
		return context.string.charCodeAt(context.index);
	}
	function skipCharacter(context) {
		context.index++;
	}
	function skipString(string, context) {
		var length = string.length;
		if(context.string.slice(context.index, context.index + length) === string) {
			context.index += length;
			return true;
		}
		return false;
	}
	function skipHexString(context) {
		var hexString = context.string.slice(context.index, context.index + HEX_STRING_LENGTH);
		for(var i = 0; i < HEX_STRING_LENGTH; i++) {
			if(!isHexDigit(hexString.charCodeAt(i))) {
				return "";
			}
			context.index++;
		}
		return hexString;
	}
	function skipUnicodeHexString(context) {
		if(context.string.charCodeAt(context.index) === CHARACTERS.ESCAPE) {
			context.index++;
			if(context.string.charCodeAt(context.index) === CHARACTERS.LOWER_U) {
				context.index++;
				return skipHexString(context);
			}
		}
		return "";
	}
	function skipWhitespace(context) {
		while(context.index < context.length && isWhitespace(getCharCode(context))) {
			context.index++;
		}
	}
	function parseJSON(context) {
		var state = states["start"];
		context.valueStack.push(undefined);	// Add value (still undefined)

		// Iterate until a final state is reached
		while(!state.isFinal) {

			// Find first acceptable next state
			var nextStateName = null;
			state.acceptStates.some(function(acceptState) {
				nextStateName = acceptState(getCharCode(context), context);
				return nextStateName !== undefined;
			});

			// If found, go to next state and perform state processing
			if(nextStateName) {
				state = states[nextStateName];
				if(state.skipWhitespace) {
					skipWhitespace(context);
				}
				if(state.process) {
					var result = state.process(context);
					if(result !== true) {
						return { value: undefined, index: context.index, errorCode: result };
					}
				}
			} else {
				return { value: undefined, index: context.index, errorCode: state.errorCode };
			}
		}

		var value = context.valueStack.pop();
		return { value: value, index: context.index };
	}
	function parseNextJSONValue(string, from) {
		return parseJSON(newContext(string, from));
	}

	return parseNextJSONValue;
})();
