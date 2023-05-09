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
				default:'Response 3'
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
		if (typeof defaultValue === "function") {
			finalValue = defaultValue({ contexts });
		} else {
			finalValue = defaultValue;
		}
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
