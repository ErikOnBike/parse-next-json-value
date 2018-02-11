# parse-next-json-value

A parser for parsing the next JSON value in a provided string. In contrast with regular parsers it is allowed
to have extraneous characters following the JSON value. Or to put it differently: only as much valid JSON is parsed
as is possible.

```
	var parseNextJSONValue = require("parse-next-json-value");

	// Parse a string containing a number and a literal (JSON.parse() throws an error on this string)
	var parseResult = parseNextJSONValue("12.34, true");
	console.log(parseResult);	// { value: 12.34, index: 5 } number is (first) valid JSON value

	// Parse a string containing an array with a number and a literal
	parseResult = parseNextJSONValue("[ 12.34, true ]");
	console.log(parseResult);	// { value: [ 12.34, true ], index: 15 } array is parsed
```

Check the resulting field `index` to see which part was parsed correctly.

The JSON specification is followed very strictly. This means that for example `"00"` will be parsed for only the
first character (and `index` will be `1`) . The second zero is not parsed, since the JSON specification does not
allow two consequtive zero's at the start of a number.

Also Unicode surrogates are checked for correctness. This means that if a low surrogate character is found,
a high surrogate must follow. Otherwise the parser will return the error code (string) `"MISSING_HIGH_SURROGATE"`.

In case a valid JSON value is present the result of the invocation of `parseNextJSONValue` has the following structure:

```
	{
		value: <value>,    // The JSON value parsed
		index: <index>     // The index inside the string where parsing stopped (further parsing failed)
	}
```

In case of an invalid JSON value, the following structure is the result:

```
	{
		value: undefined,
		index: <index>,           // The index inside the string where parsing failed
		errorCode: <errorCode>    // The error code (a string, see explanation below)
	}

	// The error code will be one of:
	//     "MISSING_VALUE"              If no valid value is present (partial parsing might have taken place, check {index} for location of parse failure).
	//     "MISSING_MEMBER"
	//     "INVALID_MEMBER_NAME";
	//     "MISSING_COLON"
	//     "INVALID_OBJECT"
	//     "INVALID_ARRAY"
	//     "INVALID_STRING"
	//     "INVALID_ESCAPE_CHAR"
	//     "INVALID_UNICODE_HEX_STRING"
	//     "MISSING_HIGH_SURROGATE"     If a unicode low surrogate (0xd800 - 0xdbff) is found, the following unicode should be a high surrogate (0xdc00 - 0xdfff).
	//     "INVALID_NUMBER"
	//     "INVALID_NUMBER_FRACTION"
	//     "INVALID_NUMBER_EXPONENT"
```

# license

BSD-3-Clause
