/*

	hoistContextualValues
	------------------

	Go through each property of an object and replace any contextual properties with their true value

	eg our object:

	{ 
		id: 23, 
		title : {
			default : 'Hello World',
			'@date.meridiem:am' : 'Good Morning World',
			'@date.meridiem:pm' : 'Good Afternoon World'
		}
	}

	our contextual object:

	{
		'@date' : {
			'meridiem' : 'am',
			'hour' : 9
		},
		'@auth' : {
			'status' : 'loggedIn',
			'userName' : 'user_abc'
		}
		...
	}

	Will return the following object:

	{
		id : 23,
		title : 'Good Morning World'
	}

	Why?

	Because our object's title property has contextual criteria.
	it says that when the context's @date.meridiem property is equal to 'am'
	then make the source object's 'title' property 'Good Morning World' rather than its default



*/

export const hoistContextualValues = (obj, { contexts }) => {
	let hoisted = Object.keys(obj).reduce((reduced, cur, ix) => {
		let v = obj[cur];
		if (typeof obj[cur] !== "function") {
			v = reconcileContextualValue(obj[cur], contexts);
		}

		reduced[cur] = v;

		return reduced;
	}, {});

	return { ...hoisted };
};

/*

	memoize
	------------------

	Cache a function call based on its stringified arguments
	Can optionally be used to wrap functions to cache their result

*/

export function memoize(func) {
	const cache = new Map();
	return function (...args) {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key);
		}
		const result = func(...args);
		cache.set(key, result);
		return result;
	};
}

/*

	getContextValue
	------------------
	
	Get the value of an item in the context object
	Lookup an address in a context object and return its value 
	with all contextual references replaced with computed values

	eg would take this context map:
	{'@foo': 
		{
		'context' : 'a'
		'property':
			{
				'@foo.context:a':'Response 1',
				'@foo.context:b||c':'Response 2',
				default:'Response 3',
				'@items.api::get[id:@entries.current.id].key:value' : 'Response 4'
			}
		}
	}

	and return 'Response A' for the function call getContextValue('@foo.property')
	why?
	------
	Because the value at the address '@foo.property' has 3 options:

	when @foo.context is equal to 'a', it resolves to 'Response 1'
	when @foo.context is equal to 'b or c', it resolves to 'Response 2'
	in all other instances it will be the default property, 'Response 3'


*/

export const getContextValue = (address, contexts) => {
	// Unpack dot notation into an actual value
	let value = getNestedObjectProp(contexts, address);

	// Parse the value for references to contextual elements
	let parsed =
		value && value !== undefined
			? reconcileContextualValue(value, contexts)
			: value;
	// Return a single value with all context references replaced with their actual values
	return parsed;
};

/*

	getNestedObjectProp
	------------------

	Use a string with dot notation to get a nest property from a javascript object

	eg getNestedObjectprop({foo:{value:'bar'}},'foo.value') returns 'bar'

*/

export function getNestedObjectProp(o, s) {
	s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
	s = s.replace(/^\./, ""); // strip a leading dot
	var a = s.split(".");
	for (var i = 0, n = a.length; i < n; ++i) {
		var k = a[i];
		if (k in o) {
			o = o[k];
		} else {
			return;
		}
	}
	return o;
}

/*

	parseFunctionSignature
	------------------

	Convert a string that's known to have a function call in it into it's returned value
	(Providing the value matches that's been specified)
	In other words, ensure the criteria is met using a callback function as part of the criteria

	Function signature is @context.path.to::functionName[argKey:argValue,anotherKey:@context.lookup.address]address.to.key.in.response:valueToMatch

	Signature will be a 2 part array
	eg: @date.api::getTime[timezone:en].hrs:>=14
	Gives the signature ['@date.api','getTime[timezone:en].hrs:>=14']

	In the above example, if the api property in the @date namespace has a function 'getTime'
	and the result of calling it with the arguments {timezone:'en'} returns and object with {hrs: >= 14}
	then return the value that came back from teh function
	Otherwise will return null

*/

export function parseFunctionSignature(signature, contexts) {
	const address = signature[0];

	let pathToFunction = getNestedObjectProp(contexts, address);

	if (!pathToFunction) return null;

	const toParse = signature[1];

	// toParse example: getTime[timezone:en,status:@auth.loggedIn.status].fulltime.hrs:>=14

	const regex =
		/^(?<functionName>[^\[]+)\[(?<args>[^\]]*)\](?<property>.+):(?<match>.+)$/;

	/*

	^                          # Match the start of the string
	(?<functionName>[^\[]+)    # Match and capture one or more characters that are not an opening square bracket in a named capture group called "functionName"
	\[                         # Match an opening square bracket
	(?<args>[^\]]*)            # Match and capture zero or more characters that are not a closing square bracket in a named capture group called "args"
	\]                         # Match a closing square bracket
	(?<property>.+)            # Match and capture one or more characters in a named capture group called "property"
	:                          # Match a colon
	(?<match>.+)               # Match and capture one or more characters in a named capture group called "match"
	$                          # Match the end of the string

	*/

	const match = toParse.match(regex);

	if (!match) {
		console.error("Invalid signature format");
		return null;
	}

	const { functionName, args, property, match: expectedMatch } = match.groups;

	if (
		!(
			functionName &&
			pathToFunction[functionName] &&
			typeof pathToFunction[functionName] === "function"
		)
	) {
		return null;
	}

	const fn = pathToFunction[functionName];

	const callProps = args
		? args.split(",").reduce((reduced, item) => {
				const [k, v] = item.split(":");
				if (v && v[0] === "@") {
					reduced[k] = getContextValue(v, contexts);
				} else {
					reduced[k] = v;
				}
				return reduced;
		  }, {})
		: {};

	const response = fn(callProps);

	const finalValue = property
		? getNestedObjectProp(response, property)
		: response;

	const isMatch = doesCriteriaValueMatch(finalValue, expectedMatch);
	return isMatch ? finalValue : null;
}

export function parseFunctionSignature_nonRegex(signature, contexts) {
	const address = signature[0];

	let pathToFunction = getNestedObjectProp(contexts, address);

	const toParse = signature[1];

	// TODO: Maybe Regex instead?

	let funcName = toParse.split("[")[0];

	// If it's not callable, return
	if (
		!(
			funcName &&
			pathToFunction[funcName] &&
			typeof pathToFunction[funcName] === "function"
		)
	) {
		return null;
	}

	let fn = pathToFunction[funcName];

	let funcProps = toParse.split("[")[1];

	let args = funcProps.split("]")[0];
	let responseCriteria = funcProps.split("]")[1];

	let responseValueAddress = responseCriteria.split(":")[0];
	let responseValueMatch = responseCriteria.split(":")[1];

	let callProps = args.length
		? args.split(",").reduce((reduced, item, ix) => {
				let keyVal = item.split(":");
				let k = keyVal[0];
				let v = keyVal[1];
				// Allow context references in arguments
				if (v && v[0] === "@") v = getContextValue(v, contexts);

				const prop = {};
				prop[k] = v;

				return { ...reduced, ...prop };
		  }, {})
		: {};

	let response = fn(callProps);

	let finalValue = responseValueAddress
		? getNestedObjectProp(response, responseValueAddress)
		: response;

	let isMatch = doesCriteriaValueMatch(finalValue, responseValueMatch);
	return doesCriteriaValueMatch(finalValue, responseValueMatch)
		? finalValue
		: null;
}

/*

	doesCriteriaValueMatch
	------------------

	Compares the actual value in state with the text value in the criteria,
	which can contain expressions and comparisons

	Allows criteria to be set eg fieldName:>=20 or fieldName:<=20 will compare as an integer 

*/

export function doesCriteriaValueMatch(value, criteriaValue) {
	if (criteriaValue.match(">=")) {
		return parseInt(value) >= parseInt(criteriaValue.replace(">=", ""));
	} else if (criteriaValue.match("<=")) {
		return parseInt(value) <= parseInt(criteriaValue.replace("<=", ""));
	} else {
		return "" + value === criteriaValue;
	}
}

/*

	reconcileContextualValue
	------------------

	Replace all contextual references in an arbitrary object with their computed values from context object

*/

export const reconcileContextualValue = (obj, contexts) => {
	if (!obj || obj === undefined) return null;

	if (Array.isArray(obj)) {
		// Map arrays
		return obj.map((i) => reconcileContextualValue(i, contexts));
	}

	let finalValue = obj;
	let highestPartsMatched = 0;
	let possibleValues = [];

	// Determine the possible values to check based on the type of the input object
	if (typeof obj === "object" && obj !== null) {
		possibleValues = Object.keys(obj).filter(
			(key) => key !== "default" && key !== "value"
		);
		let defaultValue = obj["default"] || obj["value"];
		// If the value or default property exists and is a function, return its computed response
		finalValue =
			typeof defaultValue === "function"
				? defaultValue({ contexts })
				: defaultValue;
	} else if (typeof obj === "string") {
		// If nothing is parsed, we will return whatever was passed in
		possibleValues = [obj];
	} else {
		// Not a string or object, pass back the input
		return obj;
	}

	for (const key of possibleValues) {
		const partsToMatch = key.split(" ");
		let parsedValue = null;
		let partsMatched = 0;

		for (const part of partsToMatch) {
			// Context group must start with an @
			if (part[0] === "@") {
				// Look for function calls using double colon ::
				// Eg the criteria is when the response of some API matches the final value
				// Function signature is @context.path.to::functionName[argKey:argValue,anotherKey:@context.lookup.address]address.to.key.in.response:valueToMatch
				const funcs = part.split("::");

				if (funcs.length > 1) {
					let parsedFunctionValue = parseFunctionSignature(
						funcs,
						contexts
					);

					if (parsedFunctionValue) {
						parsedValue = parsedFunctionValue;
						partsMatched++;
					} else {
						break;
					}
				} else {
					const criteria = part.split(":");

					const contextValue = getContextValue(criteria[0], contexts);

					// There is no colon to match a value, so the finalValue is the context value
					if (criteria.length === 1) {
						finalValue = contextValue;
						break;
					}

					if (contextValue === null || contextValue === undefined) {
						break;
					}

					const v =
						criteria.length > 1
							? criteria[1].split("||")
							: [contextValue];
					const matchingValue = Array.isArray(contextValue)
						? contextValue.find((val) => v.includes(val))
						: v.includes(contextValue);

					if (matchingValue) {
						parsedValue = contextValue;
						partsMatched++;
					} else {
						break;
					}
				}
			}
		}

		if (
			partsToMatch.length === partsMatched &&
			partsMatched >= highestPartsMatched
		) {
			finalValue = obj[key] === "@value" ? parsedValue : obj[key];
			highestPartsMatched = partsMatched;
		}
	}

	if (!finalValue) {
		return null;
	}

	// Whether to parse the return value for more nested references...
	// Strings with context symbols (@ sign) should be parsed
	// Objects should be parsed for nested values
	const parseResponse =
		(typeof finalValue === "string" && finalValue[0] === "@") ||
		(typeof finalValue === "object" && finalValue !== null);

	return parseResponse
		? reconcileContextualValue(finalValue, contexts)
		: finalValue;
};
