SvelteRunes
What are runes?
On this page

    What are runes?

    rune /ro͞on/ noun

    A letter or mark used as a mystical or magic symbol.

Runes are symbols that you use in .svelte and .svelte.js / .svelte.ts files to control the Svelte compiler. If you think of Svelte as a language, runes are part of the syntax — they are keywords.

Runes have a $ prefix and look like functions:

let message = $state('hello');

They differ from normal JavaScript functions in important ways, however:

    You don’t need to import them — they are part of the language
    They’re not values — you can’t assign them to a variable or pass them as arguments to a function
    Just like JavaScript keywords, they are only valid in certain positions (the compiler will help you if you put them in the wrong place)

Runes didn’t exist prior to Svelte 5.

SvelteRunes
$state
On this page

    $state
    $state.raw
    $state.snapshot
    Passing state into functions

The $state rune allows you to create reactive state, which means that your UI reacts when it changes.

<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>
clicks: {count}
</button>

Unlike other frameworks you may have encountered, there is no API for interacting with state — count is just a number, rather than an object or a function, and you can update it like you would update any other variable.
Deep state

If $state is used with an array or a simple object, the result is a deeply reactive state proxy. Proxies allow Svelte to run code when you read or write properties, including via methods like array.push(...), triggering granular updates.

    Classes like Set and Map will not be proxied, but Svelte provides reactive implementations for various built-ins like these that can be imported from svelte/reactivity.

State is proxified recursively until Svelte finds something other than an array or simple object. In a case like this...

let todos = $state([
{
done: false,
text: 'add more todos'
}
]);

...modifying an individual todo’s property will trigger updates to anything in your UI that depends on that specific property:

todos[0].done = !todos[0].done;

If you push a new object to the array, it will also be proxified:

todos.push({
done: false,
text: 'eat lunch'
});

    When you update properties of proxies, the original object is not mutated.

Note that if you destructure a reactive value, the references are not reactive — as in normal JavaScript, they are evaluated at the point of destructuring:

let { done, text } = todos[0];

// this will not affect the value of `done`
todos[0].done = !todos[0].done;

Classes

You can also use $state in class fields (whether public or private):

class Todo {
done = $state(false);
text = $state();

    constructor(text) {
    	this.text = text;
    }

    reset() {
    	this.text = '';
    	this.done = false;
    }

}

    The compiler transforms done and text into get / set methods on the class prototype referencing private fields. This means the properties are not enumerable.

When calling methods in JavaScript, the value of this matters. This won’t work, because this inside the reset method will be the <button> rather than the Todo:

<button onclick={todo.reset}>
	reset
</button>

You can either use an inline function...

<button onclick={() => todo.reset()}>
reset
</button>

...or use an arrow function in the class definition:

class Todo {
done = $state(false);
text = $state();

    constructor(text) {
    	this.text = text;
    }

    reset = () => {
    	this.text = '';
    	this.done = false;
    }

}

$state.raw

In cases where you don’t want objects and arrays to be deeply reactive you can use $state.raw.

State declared with $state.raw cannot be mutated; it can only be reassigned. In other words, rather than assigning to a property of an object, or using an array method like push, replace the object or array altogether if you’d like to update it:

let person = $state.raw({
name: 'Heraclitus',
age: 49
});

// this will have no effect
person.age += 1;

// this will work, because we're creating a new person
person = {
name: 'Heraclitus',
age: 50
};

This can improve performance with large arrays and objects that you weren’t planning to mutate anyway, since it avoids the cost of making them reactive. Note that raw state can contain reactive state (for example, a raw array of reactive objects).
$state.snapshot

To take a static snapshot of a deeply reactive $state proxy, use $state.snapshot:

<script>
	let counter = $state({ count: 0 });

	function onclick() {
		// Will log `{ count: ... }` rather than `Proxy { ... }`
		console.log($state.snapshot(counter));
	}
</script>

This is handy when you want to pass some state to an external library or API that doesn’t expect a proxy, such as structuredClone.
Passing state into functions

JavaScript is a pass-by-value language — when you call a function, the arguments are the values rather than the variables. In other words:
index

function add(a: number, b: number) {
return a + b;
}

let a = 1;
let b = 2;
let total = add(a, b);
console.log(total); // 3

a = 3;
b = 4;
console.log(total); // still 3!

If add wanted to have access to the current values of a and b, and to return the current total value, you would need to use functions instead:
index

function add(getA: () => number, getB: () => number) {
return () => getA() + getB();
}

let a = 1;
let b = 2;
let total = add(() => a, () => b);
console.log(total()); // 3

a = 3;
b = 4;
console.log(total()); // 7

State in Svelte is no different — when you reference something declared with the $state rune...

let a = $state(1);
let b = $state(2);

...you’re accessing its current value.

Note that ‘functions’ is broad — it encompasses properties of proxies and get/set properties...
index

function add(input: { a: number, b: number }) {
return {
get value() {
return input.a + input.b;
}
};
}

let input = $state({ a: 1, b: 2 });
let total = add(input);
console.log(total.value); // 3

input.a = 3;
input.b = 4;
console.log(total.value); // 7

...though if you find yourself writing code like that, consider using classes instead.

SvelteRunes
$derived
On this page

    $derived
    $derived.by
    Understanding dependencies
    Update propagation

Derived state is declared with the $derived rune:

<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
{doubled}
</button>

<p>{count} doubled is {doubled}</p>

The expression inside $derived(...) should be free of side-effects. Svelte will disallow state changes (e.g. count++) inside derived expressions.

As with $state, you can mark class fields as $derived.

    Code in Svelte components is only executed once at creation. Without the $derived rune, doubled would maintain its original value even when count changes.

$derived.by

Sometimes you need to create complex derivations that don’t fit inside a short expression. In these cases, you can use $derived.by which accepts a function as its argument.

<script>
	let numbers = $state([1, 2, 3]);
	let total = $derived.by(() => {
		let total = 0;
		for (const n of numbers) {
			total += n;
		}
		return total;
	});
</script>

<button onclick={() => numbers.push(numbers.length + 1)}>
{numbers.join(' + ')} = {total}
</button>

In essence, $derived(expression) is equivalent to $derived.by(() => expression).
Understanding dependencies

Anything read synchronously inside the $derived expression (or $derived.by function body) is considered a dependency of the derived state. When the state changes, the derived will be marked as dirty and recalculated when it is next read.

To exempt a piece of state from being treated as a dependency, use untrack.
Update propagation

Svelte uses something called push-pull reactivity — when state is updated, everything that depends on the state (whether directly or indirectly) is immediately notified of the change (the ‘push’), but derived values are not re-evaluated until they are actually read (the ‘pull’).

If the new value of a derived is referentially identical to its previous value, downstream updates will be skipped. In other words, Svelte will only update the text inside the button when large changes, not when count changes, even though large depends on count:

<script>
	let count = $state(0);
	let large = $derived(count > 10);
</script>

<button onclick={() => count++}>
{large}
</button>

SvelteRunes
$effect
On this page

    $effect
    $effect.pre
    $effect.tracking
    $effect.root
    When not to use $effect

Effects are what make your application do things. When Svelte runs an effect function, it tracks which pieces of state (and derived state) are accessed (unless accessed inside untrack), and re-runs the function when that state later changes.

Most of the effects in a Svelte app are created by Svelte itself — they’re the bits that update the text in <h1>hello {name}!</h1> when name changes, for example.

But you can also create your own effects with the $effect rune, which is useful when you need to synchronize an external system (whether that’s a library, or a <canvas> element, or something across a network) with state inside your Svelte app.

    Avoid overusing $effect! When you do too much work in effects, code often becomes difficult to understand and maintain. See when not to use $effect to learn about alternative approaches.

Your effects run after the component has been mounted to the DOM, and in a microtask after state changes (demo):

<script>
	let size = $state(50);
	let color = $state('#ff3e00');

	let canvas;

	$effect(() => {
		const context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);

		// this will re-run whenever `color` or `size` change
		context.fillStyle = color;
		context.fillRect(0, 0, size, size);
	});
</script>

<canvas bind:this={canvas} width="100" height="100" />

Re-runs are batched (i.e. changing color and size in the same moment won’t cause two separate runs), and happen after any DOM updates have been applied.

You can place $effect anywhere, not just at the top level of a component, as long as it is called during component initialization (or while a parent effect is active). It is then tied to the lifecycle of the component (or parent effect) and will therefore destroy itself when the component unmounts (or the parent effect is destroyed).

You can return a function from $effect, which will run immediately before the effect re-runs, and before it is destroyed (demo).

<script>
	let count = $state(0);
	let milliseconds = $state(1000);

	$effect(() => {
		// This will be recreated whenever `milliseconds` changes
		const interval = setInterval(() => {
			count += 1;
		}, milliseconds);

		return () => {
			// if a callback is provided, it will run
			// a) immediately before the effect re-runs
			// b) when the component is destroyed
			clearInterval(interval);
		};
	});
</script>

<h1>{count}</h1>

<button onclick={() => (milliseconds \*= 2)}>slower</button>
<button onclick={() => (milliseconds /= 2)}>faster</button>

Understanding dependencies

$effect automatically picks up any reactive values ($state, $derived, $props) that are synchronously read inside its function body and registers them as dependencies. When those dependencies change, the $effect schedules a rerun.

Values that are read asynchronously — after an await or inside a setTimeout, for example — will not be tracked. Here, the canvas will be repainted when color changes, but not when size changes (demo):

$effect(() => {
const context = canvas.getContext('2d');
context.clearRect(0, 0, canvas.width, canvas.height);

    // this will re-run whenever `color` changes...
    context.fillStyle = color;

    setTimeout(() => {
    	// ...but not when `size` changes
    	context.fillRect(0, 0, size, size);
    }, 0);

});

An effect only reruns when the object it reads changes, not when a property inside it changes. (If you want to observe changes inside an object at dev time, you can use $inspect.)

<script>
	let state = $state({ value: 0 });
	let derived = $derived({ value: state.value * 2 });

	// this will run once, because `state` is never reassigned (only mutated)
	$effect(() => {
		state;
	});

	// this will run whenever `state.value` changes...
	$effect(() => {
		state.value;
	});

	// ...and so will this, because `derived` is a new object each time
	$effect(() => {
		derived;
	});
</script>

<button onclick={() => (state.value += 1)}>
{state.value}
</button>

<p>{state.value} doubled is {derived.value}</p>

An effect only depends on the values that it read the last time it ran. This has interesting implications for effects that have conditional code.

For instance, if a is true in the code snippet below, the code inside the if block will run and b will be evaluated. As such, changes to either a or b will cause the effect to re-run.

Conversely, if a is false, b will not be evaluated, and the effect will only re-run when a changes.

$effect(() => {
console.log('running');

    if (a) {
    	console.log('b:', b);
    }

});

$effect.pre

In rare cases, you may need to run code before the DOM updates. For this we can use the $effect.pre rune:

<script>
	import { tick } from 'svelte';

	let div = $state();
	let messages = $state([]);

	// ...

	$effect.pre(() => {
		if (!div) return; // not yet mounted

		// reference `messages` array length so that this code re-runs whenever it changes
		messages.length;

		// autoscroll when new messages are added
		if (div.offsetHeight + div.scrollTop > div.scrollHeight - 20) {
			tick().then(() => {
				div.scrollTo(0, div.scrollHeight);
			});
		}
	});
</script>

<div bind:this={div}>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>

Apart from the timing, $effect.pre works exactly like $effect.
$effect.tracking

The $effect.tracking rune is an advanced feature that tells you whether or not the code is running inside a tracking context, such as an effect or inside your template (demo):

<script>
	console.log('in component setup:', $effect.tracking()); // false

	$effect(() => {
		console.log('in effect:', $effect.tracking()); // true
	});
</script>

<p>in template: {$effect.tracking()}</p> <!-- true -->

It is used to implement abstractions like createSubscriber, which will create listeners to update reactive values but only if those values are being tracked (rather than, for example, read inside an event handler).
$effect.root

The $effect.root rune is an advanced feature that creates a non-tracked scope that doesn’t auto-cleanup. This is useful for nested effects that you want to manually control. This rune also allows for the creation of effects outside of the component initialisation phase.

<script>
	let count = $state(0);

	const cleanup = $effect.root(() => {
		$effect(() => {
			console.log(count);
		});

		return () => {
			console.log('effect root cleanup');
		};
	});
</script>

When not to use $effect

In general, $effect is best considered something of an escape hatch — useful for things like analytics and direct DOM manipulation — rather than a tool you should use frequently. In particular, avoid using it to synchronise state. Instead of this...

<script>
	let count = $state(0);
	let doubled = $state();

	// don't do this!
	$effect(() => {
		doubled = count * 2;
	});
</script>

...do this:

<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

    For things that are more complicated than a simple expression like count * 2, you can also use $derived.by.

You might be tempted to do something convoluted with effects to link one value to another. The following example shows two inputs for “money spent” and “money left” that are connected to each other. If you update one, the other should update accordingly. Don’t use effects for this (demo):

<script>
	let total = 100;
	let spent = $state(0);
	let left = $state(total);

	$effect(() => {
		left = total - spent;
	});

	$effect(() => {
		spent = total - left;
	});
</script>

<label>
	<input type="range" bind:value={spent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" bind:value={left} max={total} />
	{left}/{total} left
</label>

Instead, use callbacks where possible (demo):

<script>
	let total = 100;
	let spent = $state(0);
	let left = $state(total);

	function updateSpent(e) {
		spent = +e.target.value;
		left = total - spent;
	}

	function updateLeft(e) {
		left = +e.target.value;
		spent = total - left;
	}
</script>

<label>
	<input type="range" value={spent} oninput={updateSpent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" value={left} oninput={updateLeft} max={total} />
	{left}/{total} left
</label>

If you need to use bindings, for whatever reason (for example when you want some kind of “writable $derived”), consider using getters and setters to synchronise state (demo):

<script>
	let total = 100;
	let spent = $state(0);

	let left = {
		get value() {
			return total - spent;
		},
		set value(v) {
			spent = total - v;
		}
	};
</script>

<label>
	<input type="range" bind:value={spent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" bind:value={left.value} max={total} />
	{left.value}/{total} left
</label>

If you absolutely have to update $state within an effect and run into an infinite loop because you read and write to the same $state, use untrack.

$props
On this page

    $props
    Fallback values
    Renaming props
    Rest props
    Updating props
    Type safety

The inputs to a component are referred to as props, which is short for properties. You pass props to components just like you pass attributes to elements:
App

<script lang="ts">
	import MyComponent from './MyComponent.svelte';
</script>

<MyComponent adjective="cool" />

On the other side, inside MyComponent.svelte, we can receive props with the $props rune...
MyComponent

<script lang="ts">
	let props = $props();
</script>

<p>this component is {props.adjective}</p>

...though more commonly, you’ll destructure your props:
MyComponent

<script lang="ts">
	let { adjective } = $props();
</script>

<p>this component is {adjective}</p>

Fallback values

Destructuring allows us to declare fallback values, which are used if the parent component does not set a given prop:

let { adjective = 'happy' } = $props();

    Fallback values are not turned into reactive state proxies (see Updating props for more info)

Renaming props

We can also use the destructuring assignment to rename props, which is necessary if they’re invalid identifiers, or a JavaScript keyword like super:

let { super: trouper = 'lights are gonna find me' } = $props();

Rest props

Finally, we can use a rest property to get, well, the rest of the props:

let { a, b, c, ...others } = $props();

Updating props

References to a prop inside a component update when the prop itself updates — when count changes in App.svelte, it will also change inside Child.svelte. But the child component is able to temporarily override the prop value, which can be useful for unsaved ephemeral state (demo):
App

<script lang="ts">
	import Child from './Child.svelte';

	let count = $state(0);
</script>

<button onclick={() => (count += 1)}>
clicks (parent): {count}
</button>

<Child {count} />

Child

<script lang="ts">
	let { count } = $props();
</script>

<button onclick={() => (count += 1)}>
clicks (child): {count}
</button>

While you can temporarily reassign props, you should not mutate props unless they are bindable.

If the prop is a regular object, the mutation will have no effect (demo):
App

<script lang="ts">
	import Child from './Child.svelte';
</script>

<Child object={{ count: 0 }} />

Child

<script lang="ts">
	let { object } = $props();
</script>

<button onclick={() => {
// has no effect
object.count += 1
}}>
clicks: {object.count}
</button>

If the prop is a reactive state proxy, however, then mutations will have an effect but you will see an ownership_invalid_mutation warning, because the component is mutating state that does not ‘belong’ to it (demo):
App

<script lang="ts">
	import Child from './Child.svelte';

	let object = $state({count: 0});
</script>

<Child {object} />

Child

<script lang="ts">
	let { object } = $props();
</script>

<button onclick={() => {
// will cause the count below to update,
// but with a warning. Don't mutate
// objects you don't own!
object.count += 1
}}>
clicks: {object.count}
</button>

The fallback value of a prop not declared with $bindable is left untouched — it is not turned into a reactive state proxy — meaning mutations will not cause updates (demo)
Child

<script lang="ts">
	let { object = { count: 0 } } = $props();
</script>

<button onclick={() => {
// has no effect if the fallback value is used
object.count += 1
}}>
clicks: {object.count}
</button>

In summary: don’t mutate props. Either use callback props to communicate changes, or — if parent and child should share the same object — use the $bindable rune.
Type safety

You can add type safety to your components by annotating your props, as you would with any other variable declaration. In TypeScript that might look like this...

<script lang="ts">
	let { adjective }: { adjective: string } = $props();
</script>

...while in JSDoc you can do this:

<script>
	/** @type {{ adjective: string }} */
	let { adjective } = $props();
</script>

You can, of course, separate the type declaration from the annotation:

<script lang="ts">
	interface Props {
		adjective: string;
	}

	let { adjective }: Props = $props();
</script>

    Interfaces for native DOM elements are provided in the svelte/elements module (see Typing wrapper components)

Adding types is recommended, as it ensures that people using your component can easily discover which props they should provide.

velteRunes
$bindable
On this page

    $bindable

Ordinarily, props go one way, from parent to child. This makes it easy to understand how data flows around your app.

In Svelte, component props can be bound, which means that data can also flow up from child to parent. This isn’t something you should do often, but it can simplify your code if used sparingly and carefully.

It also means that a state proxy can be mutated in the child.

    Mutation is also possible with normal props, but is strongly discouraged — Svelte will warn you if it detects that a component is mutating state it does not ‘own’.

To mark a prop as bindable, we use the $bindable rune:
FancyInput

<script lang="ts">
	let { value = $bindable(), ...props } = $props();
</script>

<input bind:value={value} {...props} />

<style>
	input {
		font-family: 'Comic Sans MS';
		color: deeppink;
	}
</style>

Now, a component that uses <FancyInput> can add the bind: directive (demo):

/// App.svelte

<script>
	import FancyInput from './FancyInput.svelte';

	let message = $state('hello');
</script>

<FancyInput bind:value={message} />
<p>{message}</p>

The parent component doesn’t have to use bind: — it can just pass a normal prop. Some parents don’t want to listen to what their children have to say.

In this case, you can specify a fallback value for when no prop is passed at all:
FancyInput

let { value = $bindable('fallback'), ...props } = $props();

SvelteRunes
$inspect
On this page

    $inspect
    $inspect(...).with
    $inspect.trace(...)

    $inspect only works during development. In a production build it becomes a noop.

The $inspect rune is roughly equivalent to console.log, with the exception that it will re-run whenever its argument changes. $inspect tracks reactive state deeply, meaning that updating something inside an object or array using fine-grained reactivity will cause it to re-fire (demo):

<script>
	let count = $state(0);
	let message = $state('hello');

	$inspect(count, message); // will console.log when `count` or `message` change
</script>

<button onclick={() => count++}>Increment</button>
<input bind:value={message} />

$inspect(...).with

$inspect returns a property with, which you can invoke with a callback, which will then be invoked instead of console.log. The first argument to the callback is either "init" or "update"; subsequent arguments are the values passed to $inspect (demo):

<script>
	let count = $state(0);

	$inspect(count).with((type, count) => {
		if (type === 'update') {
			debugger; // or `console.trace`, or whatever you want
		}
	});
</script>

<button onclick={() => count++}>Increment</button>

A convenient way to find the origin of some change is to pass console.trace to with:

$inspect(stuff).with(console.trace);

$inspect.trace(...)

This rune, added in 5.14, causes the surrounding function to be traced in development. Any time the function re-runs as part of an effect or a derived, information will be printed to the console about which pieces of reactive state caused the effect to fire.

<script>
	import { doSomeWork } from './elsewhere';

	$effect(() => {
		$inspect.trace();
		doSomeWork();
	});
</script>

$inspect.trace takes an optional first argument which will be used as the label.

SvelteRunes
$host
On this page

    $host

When compiling a component as a custom element, the $host rune provides access to the host element, allowing you to (for example) dispatch custom events (demo):
Stepper

<svelte:options customElement="my-stepper" />

<script lang="ts">
	function dispatch(type) {
		$host().dispatchEvent(new CustomEvent(type));
	}
</script>

<button onclick={() => dispatch('decrement')}>decrement</button>
<button onclick={() => dispatch('increment')}>increment</button>

App

<script lang="ts">
	import './Stepper.svelte';

	let count = $state(0);
</script>

<my-stepper
ondecrement={() => count -= 1}
onincrement={() => count += 1}

> </my-stepper>

<p>count: {count}</p>

Stores
On this page

    Stores
    When to use stores
    svelte/store
    Store contract

A store is an object that allows reactive access to a value via a simple store contract. The svelte/store module contains minimal store implementations which fulfil this contract.

Any time you have a reference to a store, you can access its value inside a component by prefixing it with the $ character. This causes Svelte to declare the prefixed variable, subscribe to the store at component initialisation and unsubscribe when appropriate.

Assignments to $-prefixed variables require that the variable be a writable store, and will result in a call to the store’s .set method.

Note that the store must be declared at the top level of the component — not inside an if block or a function, for example.

Local variables (that do not represent store values) must not have a $ prefix.

<script>
	import { writable } from 'svelte/store';

	const count = writable(0);
	console.log($count); // logs 0

	count.set(1);
	console.log($count); // logs 1

	$count = 2;
	console.log($count); // logs 2
</script>

When to use stores

Prior to Svelte 5, stores were the go-to solution for creating cross-component reactive states or extracting logic. With runes, these use cases have greatly diminished.

    when extracting logic, it’s better to take advantage of runes’ universal reactivity: You can use runes outside the top level of components and even place them into JavaScript or TypeScript files (using a .svelte.js or .svelte.ts file ending)
    when creating shared state, you can create a $state object containing the values you need and then manipulate said state

state.svelte

export const userState = $state({
name: 'name',
/_ ... _/
});

App

<script lang="ts">
	import { userState } from './state.svelte.js';
</script>

<p>User name: {userState.name}</p>
<button onclick={() => {
	userState.name = 'new name';
}}>
	change name
</button>

Stores are still a good solution when you have complex asynchronous data streams or it’s important to have more manual control over updating values or listening to changes. If you’re familiar with RxJs and want to reuse that knowledge, the $ also comes in handy for you.
svelte/store

The svelte/store module contains a minimal store implementation which fulfil the store contract. It provides methods for creating stores that you can update from the outside, stores you can only update from the inside, and for combining and deriving stores.
writable

Function that creates a store which has values that can be set from ‘outside’ components. It gets created as an object with additional set and update methods.

set is a method that takes one argument which is the value to be set. The store value gets set to the value of the argument if the store value is not already equal to it.

update is a method that takes one argument which is a callback. The callback takes the existing store value as its argument and returns the new value to be set to the store.
store

import { writable } from 'svelte/store';

const count = writable(0);

count.subscribe((value) => {
console.log(value);
}); // logs '0'

count.set(1); // logs '1'

count.update((n) => n + 1); // logs '2'

If a function is passed as the second argument, it will be called when the number of subscribers goes from zero to one (but not from one to two, etc). That function will be passed a set function which changes the value of the store, and an update function which works like the update method on the store, taking a callback to calculate the store’s new value from its old value. It must return a stop function that is called when the subscriber count goes from one to zero.
store

import { writable } from 'svelte/store';

const count = writable(0, () => {
console.log('got a subscriber');
return () => console.log('no more subscribers');
});

count.set(1); // does nothing

const unsubscribe = count.subscribe((value) => {
console.log(value);
}); // logs 'got a subscriber', then '1'

unsubscribe(); // logs 'no more subscribers'

Note that the value of a writable is lost when it is destroyed, for example when the page is refreshed. However, you can write your own logic to sync the value to for example the localStorage.
readable

Creates a store whose value cannot be set from ‘outside’, the first argument is the store’s initial value, and the second argument to readable is the same as the second argument to writable.

import { readable } from 'svelte/store';

const time = readable(new Date(), (set) => {
set(new Date());

    const interval = setInterval(() => {
    	set(new Date());
    }, 1000);

    return () => clearInterval(interval);

});

const ticktock = readable('tick', (set, update) => {
const interval = setInterval(() => {
update((sound) => (sound === 'tick' ? 'tock' : 'tick'));
}, 1000);

    return () => clearInterval(interval);

});

derived

Derives a store from one or more other stores. The callback runs initially when the first subscriber subscribes and then whenever the store dependencies change.

In the simplest version, derived takes a single store, and the callback returns a derived value.

import { derived } from 'svelte/store';

const doubled = derived(a, ($a) => $a \* 2);

The callback can set a value asynchronously by accepting a second argument, set, and an optional third argument, update, calling either or both of them when appropriate.

In this case, you can also pass a third argument to derived — the initial value of the derived store before set or update is first called. If no initial value is specified, the store’s initial value will be undefined.

import { derived } from 'svelte/store';

const delayed = derived(
a,
($a, set) => {
		setTimeout(() => set($a), 1000);
},
2000
);

const delayedIncrement = derived(a, ($a, set, update) => {
	set($a);
setTimeout(() => update((x) => x + 1), 1000);
// every time $a produces a value, this produces two
// values, $a immediately and then $a + 1 a second later
});

If you return a function from the callback, it will be called when a) the callback runs again, or b) the last subscriber unsubscribes.

import { derived } from 'svelte/store';

const tick = derived(
frequency,
($frequency, set) => {
const interval = setInterval(() => {
set(Date.now());
}, 1000 / $frequency);

    	return () => {
    		clearInterval(interval);
    	};
    },
    2000

);

In both cases, an array of arguments can be passed as the first argument instead of a single store.

import { derived } from 'svelte/store';

const summed = derived([a, b], ([$a, $b]) => $a + $b);

const delayed = derived([a, b], ([$a, $b], set) => {
setTimeout(() => set($a + $b), 1000);
});

readonly

This simple helper function makes a store readonly. You can still subscribe to the changes from the original one using this new readable store.

import { readonly, writable } from 'svelte/store';

const writableStore = writable(1);
const readableStore = readonly(writableStore);

readableStore.subscribe(console.log);

writableStore.set(2); // console: 2
readableStore.set(2); // ERROR

get

Generally, you should read the value of a store by subscribing to it and using the value as it changes over time. Occasionally, you may need to retrieve the value of a store to which you’re not subscribed. get allows you to do so.

    This works by creating a subscription, reading the value, then unsubscribing. It’s therefore not recommended in hot code paths.

import { get } from 'svelte/store';

const value = get(store);

Store contract

store = { subscribe: (subscription: (value: any) => void) => (() => void), set?: (value: any) => void }

You can create your own stores without relying on svelte/store, by implementing the store contract:

    A store must contain a .subscribe method, which must accept as its argument a subscription function. This subscription function must be immediately and synchronously called with the store’s current value upon calling .subscribe. All of a store’s active subscription functions must later be synchronously called whenever the store’s value changes.
    The .subscribe method must return an unsubscribe function. Calling an unsubscribe function must stop its subscription, and its corresponding subscription function must not be called again by the store.
    A store may optionally contain a .set method, which must accept as its argument a new value for the store, and which synchronously calls all of the store’s active subscription functions. Such a store is called a writable store.

For interoperability with RxJS Observables, the .subscribe method is also allowed to return an object with an .unsubscribe method, rather than return the unsubscription function directly. Note however that unless .subscribe synchronously calls the subscription (which is not required by the Observable spec), Svelte will see the value of the store as undefined until it does.

SvelteRuntime
Context
On this page

    Context
    Setting and getting context
    Encapsulating context interactions

Most state is component-level state that lives as long as its component lives. There’s also section-wide or app-wide state however, which also needs to be handled somehow.

The easiest way to do that is to create global state and just import that.
state.svelte

export const myGlobalState = $state({
user: {
/_ ... _/
}
/_ ... _/
});

App

<script lang="ts">
	import { myGlobalState } from './state.svelte.js';
	// ...
</script>

This has a few drawbacks though:

    it only safely works when your global state is only used client-side - for example, when you’re building a single page application that does not render any of your components on the server. If your state ends up being managed and updated on the server, it could end up being shared between sessions and/or users, causing bugs
    it may give the false impression that certain state is global when in reality it should only used in a certain part of your app

To solve these drawbacks, Svelte provides a few context primitives which alleviate these problems.
Setting and getting context

To associate an arbitrary object with the current component, use setContext.

<script>
	import { setContext } from 'svelte';

	setContext('key', value);
</script>

The context is then available to children of the component (including slotted content) with getContext.

<script>
	import { getContext } from 'svelte';

	const value = getContext('key');
</script>

setContext and getContext solve the above problems:

    the state is not global, it’s scoped to the component. That way it’s safe to render your components on the server and not leak state
    it’s clear that the state is not global but rather scoped to a specific component tree and therefore can’t be used in other parts of your app

    setContext / getContext must be called during component initialisation.

Context is not inherently reactive. If you need reactive values in context then you can pass a $state object into context, whose properties will be reactive.
Parent

<script lang="ts">
	import { setContext } from 'svelte';

	let value = $state({ count: 0 });
	setContext('counter', value);
</script>

<button onclick={() => value.count++}>increment</button>

Child

<script lang="ts">
	import { getContext } from 'svelte';

	const value = getContext('counter');
</script>

<p>Count is {value.count}</p>

To check whether a given key has been set in the context of a parent component, use hasContext.

<script>
	import { hasContext } from 'svelte';

	if (hasContext('key')) {
		// do something
	}
</script>

You can also retrieve the whole context map that belongs to the closest parent component using getAllContexts. This is useful, for example, if you programmatically create a component and want to pass the existing context to it.

<script>
	import { getAllContexts } from 'svelte';

	const contexts = getAllContexts();
</script>

Encapsulating context interactions

The above methods are very unopinionated about how to use them. When your app grows in scale, it’s worthwhile to encapsulate setting and getting the context into functions and properly type them.

import { getContext, setContext } from 'svelte';

let userKey = Symbol('user');

export function setUserContext(user: User) {
setContext(userKey, user);
}

export function getUserContext(): User {
return getContext(userKey) as User;
}

Lifecycle hooks
On this page

    Lifecycle hooks
    onMount
    onDestroy
    tick
    Deprecated: beforeUpdate / `afterUpdate`

In Svelte 5, the component lifecycle consists of only two parts: Its creation and its destruction. Everything in-between — when certain state is updated — is not related to the component as a whole; only the parts that need to react to the state change are notified. This is because under the hood the smallest unit of change is actually not a component, it’s the (render) effects that the component sets up upon component initialization. Consequently, there’s no such thing as a “before update”/"after update” hook.
onMount

The onMount function schedules a callback to run as soon as the component has been mounted to the DOM. It must be called during the component’s initialisation (but doesn’t need to live inside the component; it can be called from an external module).

onMount does not run inside a component that is rendered on the server.

<script>
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('the component has mounted');
	});
</script>

If a function is returned from onMount, it will be called when the component is unmounted.

<script>
	import { onMount } from 'svelte';

	onMount(() => {
		const interval = setInterval(() => {
			console.log('beep');
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

    This behaviour will only work when the function passed to onMount synchronously returns a value. async functions always return a Promise, and as such cannot synchronously return a function.

onDestroy

Schedules a callback to run immediately before the component is unmounted.

Out of onMount, beforeUpdate, afterUpdate and onDestroy, this is the only one that runs inside a server-side component.

function onDestroy(fn: () => any): void;

Schedules a callback to run immediately before the component is unmounted.

Out of onMount, beforeUpdate, afterUpdate and onDestroy, this is the only one that runs inside a server-side component.

<script>
	import { onDestroy } from 'svelte';

	onDestroy(() => {
		console.log('the component is being destroyed');
	});
</script>

tick

While there’s no “after update” hook, you can use tick to ensure that the UI is updated before continuing. tick returns a promise that resolves once any pending state changes have been applied, or in the next microtask if there are none.

<script>
	import { tick } from 'svelte';

	$effect.pre(() => {
		console.log('the component is about to update');
		tick().then(() => {
				console.log('the component just updated');
		});
	});
</script>

Deprecated: beforeUpdate / afterUpdate

Svelte 4 contained hooks that ran before and after the component as a whole was updated. For backwards compatibility, these hooks were shimmed in Svelte 5 but not available inside components that use runes.

<script>
	import { beforeUpdate, afterUpdate } from 'svelte';

	beforeUpdate(() => {
		console.log('the component is about to update');
	});

	afterUpdate(() => {
		console.log('the component just updated');
	});
</script>

Instead of beforeUpdate use $effect.pre and instead of afterUpdate use $effect instead - these runes offer more granular control and only react to the changes you’re actually interested in.
Chat window example

To implement a chat window that autoscrolls to the bottom when new messages appear (but only if you were already scrolled to the bottom), we need to measure the DOM before we update it.

In Svelte 4, we do this with beforeUpdate, but this is a flawed approach — it fires before every update, whether it’s relevant or not. In the example below, we need to introduce checks like updatingMessages to make sure we don’t mess with the scroll position when someone toggles dark mode.

With runes, we can use $effect.pre, which behaves the same as $effect but runs before the DOM is updated. As long as we explicitly reference messages inside the effect body, it will run whenever messages changes, but not when theme changes.

beforeUpdate, and its equally troublesome counterpart afterUpdate, are therefore deprecated in Svelte 5.

    Before
    After

<script>
	import { beforeUpdate, afterUpdate, tick } from 'svelte';

	let updatingMessages = false;
	let theme = $state('dark');
	let messages = $state([]);

	let viewport;

	beforeUpdate(() => {
	$effect.pre(() => {
		if (!updatingMessages) return;
		messages;
		const autoscroll = viewport && viewport.offsetHeight + viewport.scrollTop > viewport.scrollHeight - 50;

		if (autoscroll) {
			tick().then(() => {
				viewport.scrollTo(0, viewport.scrollHeight);
			});
		}

		updatingMessages = false;
	});

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			const text = event.target.value;
			if (!text) return;

			updatingMessages = true;
			messages = [...messages, text];
			event.target.value = '';
		}
	}

	function toggle() {
		toggleValue = !toggleValue;
	}
</script>

<div class:dark={theme === 'dark'}>
	<div bind:this={viewport}>
		{#each messages as message}
			<p>{message}</p>
		{/each}
	</div>

    <input onkeydown={handleKeydown} />

    <button onclick={toggle}> Toggle dark mode </button>

</div>

SvelteReference
svelte/store
On this page

    svelte/store
    derived
    fromStore
    get
    readable
    readonly
    toStore
    writable
    Readable
    StartStopNotifier
    Subscriber
    Unsubscriber
    Updater
    Writable

import {
derived,
fromStore,
get,
readable,
readonly,
toStore,
writable
} from 'svelte/store';

derived

Derived value store by synchronizing one or more readable stores and applying an aggregation function over its input values.

function derived<S extends Stores, T>(
stores: S,
fn: (
values: StoresValues<S>,
set: (value: T) => void,
update: (fn: Updater<T>) => void
) => Unsubscriber | void,
initial_value?: T | undefined
): Readable<T>;

function derived<S extends Stores, T>(
stores: S,
fn: (values: StoresValues<S>) => T,
initial_value?: T | undefined
): Readable<T>;

fromStore

function fromStore<V>(store: Writable<V>): {
current: V;
};

function fromStore<V>(store: Readable<V>): {
readonly current: V;
};

get

Get the current value from a store by subscribing and immediately unsubscribing.

function get<T>(store: Readable<T>): T;

readable

Creates a Readable store that allows reading by subscription.

function readable<T>(
value?: T | undefined,
start?: StartStopNotifier<T> | undefined
): Readable<T>;

readonly

Takes a store and returns a new one derived from the old one that is readable.

function readonly<T>(store: Readable<T>): Readable<T>;

toStore

function toStore<V>(
get: () => V,
set: (v: V) => void
): Writable<V>;

function toStore<V>(get: () => V): Readable<V>;

writable

Create a Writable store that allows both updating and reading by subscription.

function writable<T>(
value?: T | undefined,
start?: StartStopNotifier<T> | undefined
): Writable<T>;

Readable

Readable interface for subscribing.

interface Readable<T> {…}

subscribe(this: void, run: Subscriber<T>, invalidate?: () => void): Unsubscriber;

    run subscription callback
    invalidate cleanup callback

Subscribe on value changes.
StartStopNotifier

Start and stop notification callbacks. This function is called when the first subscriber subscribes.

type StartStopNotifier<T> = (
set: (value: T) => void,
update: (fn: Updater<T>) => void
) => void | (() => void);

Subscriber

Callback to inform of a value updates.

type Subscriber<T> = (value: T) => void;

Unsubscriber

Unsubscribes from value updates.

type Unsubscriber = () => void;

Updater

Callback to update a value.

type Updater<T> = (value: T) => T;

Writable

Writable interface for both updating and subscribing.

interface Writable<T> extends Readable<T> {…}

set(this: void, value: T): void;

    value to set

Set value and inform subscribers.

update(this: void, updater: Updater<T>): void;

    updater callback

Update value using callback and inform subscribers.


SvelteReference
svelte/reactivity
On this page

    svelte/reactivity
    MediaQuery
    SvelteDate
    SvelteMap
    SvelteSet
    SvelteURL
    SvelteURLSearchParams
    createSubscriber

Svelte provides reactive versions of various built-ins like SvelteMap, SvelteSet and SvelteURL. These can be imported from svelte/reactivity and used just like their native counterparts.

<script>
	import { SvelteURL } from 'svelte/reactivity';

	const url = new SvelteURL('https://example.com/path');
</script>

<!-- changes to these... -->
<input bind:value={url.protocol} />
<input bind:value={url.hostname} />
<input bind:value={url.pathname} />

<hr />

<!-- will update `href` and vice versa -->
<input bind:value={url.href} />

import {
	MediaQuery,
	SvelteDate,
	SvelteMap,
	SvelteSet,
	SvelteURL,
	SvelteURLSearchParams,
	createSubscriber
} from 'svelte/reactivity';

MediaQuery

    Available since 5.7.0

Creates a media query and provides a current property that reflects whether or not it matches.

Use it carefully — during server-side rendering, there is no way to know what the correct value should be, potentially causing content to change upon hydration. If you can use the media query in CSS to achieve the same effect, do that.

<script>
	import { MediaQuery } from 'svelte/reactivity';

	const large = new MediaQuery('min-width: 800px');
</script>

<h1>{large.current ? 'large screen' : 'small screen'}</h1>

class MediaQuery extends ReactiveValue<boolean> {…}

constructor(query: string, fallback?: boolean | undefined);

    query A media query string
    fallback Fallback value for the server

SvelteDate

class SvelteDate extends Date {…}

constructor(...params: any[]);

#private;

SvelteMap

class SvelteMap<K, V> extends Map<K, V> {…}

constructor(value?: Iterable<readonly [K, V]> | null | undefined);

set(key: K, value: V): this;

#private;

SvelteSet

class SvelteSet<T> extends Set<T> {…}

constructor(value?: Iterable<T> | null | undefined);

add(value: T): this;

#private;

SvelteURL

class SvelteURL extends URL {…}

get searchParams(): SvelteURLSearchParams;

#private;

SvelteURLSearchParams

class SvelteURLSearchParams extends URLSearchParams {…}

[REPLACE](params: URLSearchParams): void;

#private;

createSubscriber

    Available since 5.7.0

Returns a subscribe function that, if called in an effect (including expressions in the template), calls its start callback with an update function. Whenever update is called, the effect re-runs.

If start returns a function, it will be called when the effect is destroyed.

If subscribe is called in multiple effects, start will only be called once as long as the effects are active, and the returned teardown function will only be called when all effects are destroyed.

It’s best understood with an example. Here’s an implementation of MediaQuery:

import { createSubscriber } from 'svelte/reactivity';
import { on } from 'svelte/events';

export class MediaQuery {
	#query;
	#subscribe;

	constructor(query) {
		this.#query = window.matchMedia(`(${query})`);

		this.#subscribe = createSubscriber((update) => {
			// when the `change` event occurs, re-run any effects that read `this.current`
			const off = on(this.#query, 'change', update);

			// stop listening when all the effects are destroyed
			return () => off();
		});
	}

	get current() {
		this.#subscribe();

		// Return the current state of the query, whether or not we're in an effect
		return this.#query.matches;
	}
}

function createSubscriber(
	start: (update: () => void) => (() => void) | void
): () => void;

Edit this page on GitHub
previous next
svelte/reactivity/window
svelte/server