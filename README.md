# Context Mapper — <br/> Responsive data, simplified views
## Is your data a single source of truth? Or a case of 'it depends...'?

If you've got data with many different properties accounting for different use-cases, you may find your views become knotted with logic just to get the right bit of data displayed in your application.

## What is Context Mapper?

It's a Javascript API to allow object properties to be mapped to different values depending on the context.

The aim is to allow certain elements of logic to be abstracted away from the application, and instead to be written directly in the data store so that the data store becomes more reactive to contextual changes, and allowing application logic to be more functional.

### TL;DR:

It takes an exhaustive set of *potential* data values, and turns them into a single, *true* set, based on the current state.

For example: Turning this:

```
{
	colors: {
		darkMode : {
			background : '#111',
			foreground: '#FFF'
		},
		lightMode : {
			background : '#DDD',
			foreground: '#222'
		}
	}
}
```
Into this, depending on some criteria:
```
{
	colors: {
		background : '#DDD',
		foreground: '#222'
	}
}

for state:

{
	timeOfDay : 'morning'
}

```
Criteria could be anything — time of day, user preference settings...
you control how different contextual values resolve to different mutations of the data.

This means throughout your application you can just use the `colors.background` property, and abstract what that actually resolves to in a different layer of the application.

## Quickstart

Import the `hoistContextualValues` function, then run it, providing 2 objects — an object with contextual properties, and another object that acts as a state map to find the current values that should be used:

```
import { hoistContextualValues } from "./index.js";

// Our state map is the source of truth, this has the current data for our application
const stateMap = {

	// The buckets/namespaces are arbitrary, you can define these however you want
	// They allow you to have multiple different state groups and avoid property name clashes
	
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

The parser looks through each object property, and sets the value of each to whichever rule matches the current state context. If the state map changes, you will need to run the function again to compute the new values based on the updated state.

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

### More dynamic example

The following example shows how a function can actually be run *as part of the criteria* and then evaluate the response of that function to check whether to map to object to that value.

```
// Our current state
// ----------------------------------------
const stateMap = {
	"@auth": : {
		user : {
			timezone : "America/New_York"
		}
	}
	"@date": {
		// Here our state actually contains a function we can call at runtime whenever we are re-evalutating to resolve a value
		getTime: getTime: ({timezone:'Europe/London'}) => {
			// Imaginary function that returns a Date for a timezone
			const now = new DateForTimezone(timezone);
			const hours = now.getHours();
			return { hours: hours };
		},
	},

};

// Our content model with contextual rules
// -----------------------------------------
const content = {

	greeting: {
		default: "Hello World",
		// Here we actually call the getTime() function in our state object, and evaluate its response as part of our criteria
		// If the function call returns an object {hours} with hours property less than or equal to 11, then resolve property 'Morning, World!'
		"@date::getTime[].hours:<=11": "Morning, World!",
		// If the response.hours is greater than or equal to 12, then resolve to 'Afternoon, World!'
		"@date::getTime[].hours:>=12": "Afternoon, World!",
	}

};

// This is essentially the same as the previous example
// But you can pass arguments that refer back to the context state map, which makes it a powerful feature...

// Referring back to context within function expressions
// -----------------------------------------
const content = {

	greeting: {
		default: "Hello World",
		// If we are holding some user-specific value in state, we can refer back to it as an argument
		// Maybe our getTime function can check for a timezone based on the user timezone
		// Now it can generate different values by interpolating the state values for a unique context
		"@date::getTime[timezone:@auth.user.timezone].hours:<=11": "Morning, World!",
		"@date::getTime[timezone:@auth.user.timezone].hours:>=12": "Afternoon, World!",
	}

};

```
