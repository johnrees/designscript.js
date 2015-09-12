### About

A DesignScript parser and interpreter that runs in the browser. You can use it to parse, generate, and run DesignScript code.

Most of the project is written in TypeScript.

#### This project currently includes:

* AST
* Parser
* Interpreter (with debugging support)

#### Language features:

* Language blocks (Imperative and Associative)
* Replication
* Replication guides
* Type declaration for variables, function arguments
* Range expressions

See `src/AST.ts` for a complete list.

#### Not yet implemented

* For, while loops in imperative blocks
* Classes

### Usage

#### Code generation

```
var AST = require('./ds').AST;

var sl = 
	new AST.StatementListNode(
		new AST.AssignmentNode(
			new AST.IdentifierNode("a", new AST.Type("number")),
			new AST.NumberNode("3.14159")));
		
console.log( sl.toString() ); // prints "a : number = 3.14159;"

```

#### Parser

```
var ds = require('./ds');

// parse some DesignScript
var ast = ds.Parser.parse('w = [Imperative]{ return = 4; }'); 
```

#### Interpreter

Continuing from the Parser example:

```
var i = new ds.Interpreter();
i.run( ast ); 

console.log( i.env.lookup("w") ); // prints "4"
```

#### Debugging

Pass a function to an Interpreter that will be invoked upon consuming every part of the AST. When invoked, the Interpreter passes along a callback that must be invoked in order to continue execution.

```
var interpreter = new ds.Interpreter(
	function(node, env, stack, callback){
		// do stuff with node, env, stack
		callback();
	});
interpreter.run( ast ); 
 
```

See `example/debugger.html` for a more complete example.

### Install

Install [node.js](http://www.nodejs.org)

```
# npm install -g jison
# npm install -g browserify
# npm install -g typescript
```

### Build

```
# make build
```

## Build for the web

```
# make release
```
Produces ds.js in the build directory

### Test

```
# make test
```
