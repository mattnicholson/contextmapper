# Context Mapper

Javascript to allow data to be variable depending on the context.

The aim of these functions are to allow certain elements of logic to be abstracted away from the application, and instead to be written directly in the data store so that the data store becomes more reactive to contextual changes, and allowing application logic to be more functional.

## Quickstart

Import the `hoistContextualValues` function, then run it, providing 2 objects — an object with contextual properties, and another object that acts as a state map to find the current values that should be used:

```
import { hoistContextualValues } from "./index.js";

// Our state map is the source of truth, this has the current data for our application
const stateMap = {
	"@defaults": {
		greeting: "Hi!",
	},
	"@date": {
		meridiem: 'am'
	},
	"@auth": {
		status: "loggedIn",
		userName: "user_abc",
		lang: "en",
	}
};

// Here is our object that can have different values depending on the values in the state map
const objectToResolve = {
	greeting: {
		default: "Hello World",
		"@date.meridiem:am": "Morning, World!",
		"@date.meridiem:pm": "Afternoon, World!",
	},
};

// Now we map the two: we resolve the objectToResolve into a version with the correct value based on the current data in the state map object
const mappedObject = hoistContextualValues(objectToResolve, {
	contexts: {
		...stateMap,
	},
})

// Mapped object will output {greeting: 'Morning, World!'} because our state map has a value '@date.meridiem' of 'am', which has been mapped to our greeting property based on the context criteria '@date.meridium:am'


```

## Basic Use Case

We have some data that we want to change depending on some condition or state.

Lets say it's a greeting we will render at some point. In the morning, we want to say 'Good morning', and in the afternoon, we want our greeting to be 'Good afternoon'.

We could put this logic in the rendering component, but using Context Mapper, we don't need to — we can make the data itself dynamic, and make the `greeting` property change depnding on the condition:

### Our object template — contextual syntax:

Our default greeting is 'Hello World', but when certain contextual criteria are met, we can change the value.
Notice some of the properties are prefixed with an `@` symbol. This tells the script that when certain values are present in teh state map, we shoudl override the default value with this alternative.

```

{
	"greeting" : {
		"default" : 'Hello World',
		"@date.meridiem:am" : "Morning, World",
		"@date.meridiem:pm" : "Afternoon, World"
	}
}

```

### Our state map

We need to provide a state of contexts so that the script can resolve the values to what they should be when the correct conditions are met. We provide a second object of states, grouped with keys prefixed by an '@' symbol.

```

{
	"@date" : {
		"meridiem" : 'am',
		"hour" : 9
	},
	"@auth" : {
		"status" : "loggedIn",
		"userName" : "user_abc"
	}
	...
}

```

### Putting the two together

The parser looks through each object property, and sets the value of each to whichever rule mathes the current state context. If the state map changes, you will need to run the function again to compute the new values based on the updated state.

### Dynamic example

The following example shows how a function to set the meridiem of the day (AM / PM) could be used to change the computed data for an application or view.

```

// Example function to create some dynamic data
// ----------------------------------------
function getTimeOfDay() {
	const now = new Date();
	const hours = now.getHours();
	return hours >= 12 ? "pm" : "am";
}

// Our current state
// ----------------------------------------
const stateMap = {

	"@date": {
		// Here we dynamically set the time of day in our state map
		meridiem: getTimeOfDay(),
	},

};

// Our content model with contextual rules
// -----------------------------------------
const content = {

	greeting: {
		default: "Hello World",
		// Here we set what greeting based on whether the value in the state map at '@date.meridiem' is 'am or 'pm'
		// If stateMap['@date'].meridiem === 'am', set greeting to 'Morning, World!'
		"@date.meridiem:am": "Morning, World!",
		// If stateMap['@date'].meridiem === 'pm', set greeting to 'Afternoon, World!'
		"@date.meridiem:pm": "Afternoon, World!",
	}

};

const actualContent = hoistContextualValues(content, {
	contexts: {
		...stateMap,
	},
})

// And...hey presto! Our data changes depending on the conditions that are met.
// In the morning, we get...

/*

{
	"greeting" : "Morning, World!
}

*/

/*
Less logic needed in the view...
Now that we've created a syntax that makes the data itself a bit more logical and responsive, we can have more basic functional components for our view...

e.g in React:

*/

<MyGreetingComponent greeting={actualContent.greeting} />

```
