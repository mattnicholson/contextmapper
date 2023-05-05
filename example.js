import { hoistContextualValues } from "./index.js";
/*
	Test:
	-----------------
	If it's before noon, should output

	{
		id: 23,
		title : "Morning, World!"
	}

	otherwise
	
	{
		id: 23,
		title : "Afternoon, World!"
	}

*/

function getTimeOfDay() {
	const now = new Date();
	const hours = now.getHours();
	return hours >= 12 ? "pm" : "am";
}

const contextMap = {
	"@defaults": {
		greeting: "Hi!",
	},
	"@content": {
		greeting: {
			default: "Please log in...",
			"@auth.status:loggedIn": {
				"@auth.lang:en": {
					"@date.meridiem:am": "Morning, User!",
					"@date.meridiem:pm": "Afternoon, User!",
				},
				"@auth.lang:fr": "Bonjour, user!",
			},
		},
	},
	"@date": {
		meridiem: getTimeOfDay(),
	},
	"@auth": {
		status: "loggedIn",
		userName: "user_abc",
		lang: "en",
	},
};
const example1 = {
	id: 23,
	title: {
		default: "Hello World",
		"@date.meridiem:am": "Morning, World!",
		"@date.meridiem:pm": "Afternoon, World!",
	},
};

const example2 = {
	greeting: "@content.greeting",
};

export const runContextMapExamples = () => {
	console.log("Context Map", contextMap);
	console.log(
		"Example 1:",
		example1,
		"Becomes:",
		hoistContextualValues(example1, {
			contexts: {
				...contextMap,
			},
		})
	);
	console.log(
		"Example 2 (Logged In):",
		example2,
		"Becomes:",
		hoistContextualValues(example2, {
			contexts: {
				...contextMap,
			},
		})
	);
	console.log(
		"Example 2 (Logged In, Different Language):",
		example2,
		"Becomes:",
		hoistContextualValues(example2, {
			contexts: {
				...contextMap,
				"@auth": {
					...contextMap["@auth"],
					lang: "fr",
				},
			},
		})
	);
	console.log(
		"Example 2 (Logged Out):",
		example2,
		"Becomes:",
		hoistContextualValues(example2, {
			contexts: {
				...contextMap,
				"@auth": {
					status: "loggedOut",
				},
			},
		})
	);
};
