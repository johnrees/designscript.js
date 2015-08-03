import enviro = require('./environment');
import ast = require('./ast');
import visitor = require('./visitor');

export class TypedFunctionDefinition {
    f: (any) => any;
    al: ast.TypedIdentifierNode[];

    constructor(f: (any) => any, al: ast.TypedIdentifierNode[] = []) {
        this.f = f;
        this.al = al; // the type identifiers for the func def
    }
}

export class ReplicatedFunctionArgument {
    v: any;
    rgl: ast.ReplicationGuideListNode;

    constructor(v: any, rgl: ast.ReplicationGuideListNode) {
        this.v = v;
        this.rgl = rgl;
    }
}

export class Interpreter implements visitor.Visitor<any> {

    env: enviro.Environment = new enviro.Environment();
    extensions: { [id: string]: TypedFunctionDefinition; };

    constructor(extensions) {
        this.extensions = extensions;
    }

    run(sl: ast.StatementListNode): void {
        this.env = this.builtins(this.extensions);

        this.evalFunctionDefinitionNodes(sl);
        this.visitStatementListNode(sl);
    }

    builtins(exts: { [id: string]: any }): enviro.Environment {
        var e: enviro.Environment = new enviro.Environment();

        if (exts) {
            for (var id in exts) {
                e.set(id, exts[id]);
            }
        }

        e.set("print", new TypedFunctionDefinition((x) => console.log(x)));
        return e;
    }

    evalFunctionDefinitionNodes(sl: ast.StatementListNode): void {
        var r, s;
        while (sl) {
            s = sl.head;
            sl = sl.tail;
            if (s instanceof ast.FunctionDefinitionNode)
                s.accept(this);
        }
    }

    pushEnvironment(): void {
        this.env = new enviro.Environment(this.env);
    }

    popEnvironment(): void {
        if (this.env == null) throw new Error("Cannot pop empty environment!");

        this.env = this.env.outer;
    }

    visitStatementListNode(sl: ast.StatementListNode): void {
        var r, s;
        while (sl) {
            s = sl.head;
            sl = sl.tail;
          
            // empty statement list
            if (!s)
                break;

            // todo: hoist func defs
            if (!(s instanceof ast.FunctionDefinitionNode))
                r = s.accept(this);
        }

        return r;
    }

    visitReplicationGuideListNode(r: ast.ReplicationGuideListNode): any {
        throw new Error("visitReplicatedGuideListNode not implemented");
    }

    visitReplicationGuideNode(r: ast.ReplicationGuideNode): any {
        throw new Error("visitReplicatedGuideNode not implemented");
    }

    visitArrayIndexNode(e: ast.ArrayIndexNode): any {
        var array = e.array.accept(this);
        var index = e.index.accept(this);
        return array[index];
    }

    visitArrayNode(e: ast.ArrayNode): any[] {
        return e.expressionList.accept(this);
    }

    visitStringNode(e: ast.StringNode): string {
        return e.value;
    }

    visitBooleanNode(e: ast.BooleanNode): boolean {
        return e.value;
    }

    visitDoubleNode(e: ast.DoubleNode): Number {
        return e.value;
    }

    visitIntNode(e: ast.IntNode): Number {
        return e.value;
    }

    visitIdentifierNode(e: ast.IdentifierNode): any {
        return this.env.lookup(e.name);
    }

    visitTypedIdentifierNode(e: ast.TypedIdentifierNode): any {
        return this.env.lookup(e.name);
    }

    visitIdentifierListNode(n: ast.IdentifierListNode): any {
        return null;
    }

    visitBinaryExpressionNode(e: ast.BinaryExpressionNode): any {
        switch (e.operator) {
            case "+":
                return e.firstExpression.accept(this) + e.secondExpression.accept(this);
            case "-":
                return e.firstExpression.accept(this) - e.secondExpression.accept(this);
            case "*":
                return e.firstExpression.accept(this) * e.secondExpression.accept(this);
            case "<":
                return e.firstExpression.accept(this) < e.secondExpression.accept(this);
            case "||":
                return e.firstExpression.accept(this) || e.secondExpression.accept(this);
            case "==":
                return e.firstExpression.accept(this) == e.secondExpression.accept(this);
            case ">":
                return e.firstExpression.accept(this) > e.secondExpression.accept(this);
        }

        throw new Error("Unknown binary operator type");
    }

    visitReturnNode(s: ast.ReturnNode) {
        return s.expression.accept(this);
    }

    visitIfStatementNode(s: ast.IfStatementNode) {
        var test = s.testExpression.accept(this);
        if (test === true) {
            return this.evalBlockStatement(s.trueStatementList);
        } else {
            return s.falseStatementList.accept(this);
        }
    }

    evalBlockStatement(sl: ast.StatementListNode): any {
        this.pushEnvironment();
        var r = sl.accept(this);
        this.popEnvironment();
        return r;
    }

    visitFunctionCallNode(e: ast.FunctionCallNode): any {
        var fd = this.env.lookup(e.functionId.name);
        return this.replicate(fd, e.arguments.accept(this));
    }

    visitReplicationExpressionNode(fa: ast.ReplicationExpressionNode): any {
        return new ReplicatedFunctionArgument(fa.expression.accept(this), fa.replicationGuideList)
    }

    visitExpressionListNode(el: ast.ExpressionListNode) {
        var vs = [];
        while (el != undefined) {
            vs.push(el.head.accept(this));
            el = el.tail;
        }
        return vs;
    }

    visitAssignmentNode(s: ast.AssignmentNode) {
        this.env.set(s.identifier.name, s.expression.accept(this));
    }

    visitFunctionDefinitionNode(fds: ast.FunctionDefinitionNode): any {

        // unpack the argument list 
        var il = fds.arguments;
        var val = [];
        while (il != undefined) {
            val.push(il.head);
            il = il.tail;
        }

        var fd;
        var env = this.env;
        var interpreter = this;

        function f() {
            var args = Array.prototype.slice.call(arguments);
            return interpreter.apply(fds, env, args);
        }

        fd = new TypedFunctionDefinition(f, val);

        this.env.set(fds.identifier.name, fd);
    }

    apply(fd: ast.FunctionDefinitionNode, env: enviro.Environment, args: any[]): any {

        env = new enviro.Environment(env);

        // bind the arguments in the scope 
        var i = 0;
        var il = fd.arguments;
        while (il != null) {
            env.set(il.head.name, args[i++]);
            il = il.tail;
        };

        var current = this.env;
        this.env = env;

        var r = fd.body.accept(this);

        this.env = current;
        return r;
    }

    replicate(fd: TypedFunctionDefinition, args: any[]): any {

        // we'll need to check for ReplicatedFunctionArgument here

        // if all types match, simply execute
        return fd.f.apply(undefined, args);

        /*
         *
        // form the indices of all arguments
        var ri = (new Array(fd.al.length))
            .map(function(){ return []; });

        args.forEach(function(x,i){ if (x.rg === undefined) ri[0].push(i); else ri[i-1].push(i); })

        var nrg = ri.length; // num rep guides, if none supplied, we have just one
        var lrf = []; // the shortest array in the replication guide
        var finalArgs = new Array( lrf[0] ); // a structured array representing the final arguments to apply to the function
        var numFuncArgs = 1; // number of arguments to the function
        var i, j, k, l;

        // if all of the arguments match their expected types, execute
        // otherwise, we must divide all of the non-matching fields and recurse

        // for every replication guide
        for (i = 0; i < nrg; i++){
            
            // for every element in the argument array for this replication guide
            for (j = 0; j < lrf[i]; j++){

                // for every element already in the current argument array
                for (k = 0; k < finalArgs.length; k++){

                    // initialize the arguments for this invocation or obtain from finalArgs
                    targs = i === 0 ? new Array(numFuncArgs) : finalArgs[ k ];

                    // for every index in the replication guide
                    for (l = 0; l < ri[i]; l++){
                        targs[ ri[i][l] ] = args[l][j]; // one function argument		
                    }
                }
            }
        }

        return finalArgs.map(function(x){
            return fd.f.apply( null, x );
        });
    */
    }
    
    visitImperativeBlockNode(node : ast.ImperativeBlockNode) : any { throw new Error("Not implemented"); };
    visitAssociativeBlockNode(node : ast.AssociativeBlockNode) : any { throw new Error("Not implemented"); };
    
}