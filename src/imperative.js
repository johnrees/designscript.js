var enviro = require('./environment');
var ast = require('./ast');
var types = require('./types');
var replicator = require('./replicator');
var Interpreter = (function () {
    function Interpreter(extensions) {
        this.replicator = new replicator.Replicator();
        this.env = new enviro.Environment();
        this.extensions = extensions;
    }
    Interpreter.prototype.run = function (sl) {
        this.env = this.builtins(this.extensions);
        this.evalFunctionDefinitionNodes(sl);
        this.visitStatementListNode(sl);
    };
    Interpreter.prototype.builtins = function (exts) {
        var e = new enviro.Environment();
        if (exts) {
            for (var id in exts) {
                e.set(id, exts[id]);
            }
        }
        e.set("print", new types.TypedFunction(function (x) { return console.log(x); }, [new types.TypedArgument("a")], "print"));
        return e;
    };
    Interpreter.prototype.evalFunctionDefinitionNodes = function (sl) {
        var r, s;
        while (sl) {
            s = sl.head;
            sl = sl.tail;
            if (s instanceof ast.FunctionDefinitionNode)
                s.accept(this);
        }
    };
    Interpreter.prototype.pushEnvironment = function () {
        this.env = new enviro.Environment(this.env);
    };
    Interpreter.prototype.popEnvironment = function () {
        if (this.env == null)
            throw new Error("Cannot pop empty environment!");
        this.env = this.env.outer;
    };
    Interpreter.prototype.visitStatementListNode = function (sl) {
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
    };
    Interpreter.prototype.visitReplicationGuideListNode = function (r) {
        throw new Error("visitReplicatedGuideListNode not implemented");
    };
    Interpreter.prototype.visitReplicationGuideNode = function (r) {
        throw new Error("visitReplicatedGuideNode not implemented");
    };
    Interpreter.prototype.visitArrayIndexNode = function (e) {
        var array = e.array.accept(this);
        var index = e.index.accept(this);
        return array[index];
    };
    Interpreter.prototype.visitArrayNode = function (e) {
        return e.expressionList.accept(this);
    };
    Interpreter.prototype.visitStringNode = function (e) {
        return e.value;
    };
    Interpreter.prototype.visitBooleanNode = function (e) {
        return e.value;
    };
    Interpreter.prototype.visitNumberNode = function (e) {
        return e.value;
    };
    Interpreter.prototype.visitIdentifierNode = function (e) {
        return this.env.lookup(e.name);
    };
    Interpreter.prototype.visitIdentifierListNode = function (n) {
        return null;
    };
    Interpreter.prototype.visitBinaryExpressionNode = function (e) {
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
    };
    Interpreter.prototype.visitReturnNode = function (s) {
        return s.expression.accept(this);
    };
    Interpreter.prototype.visitIfStatementNode = function (s) {
        var test = s.testExpression.accept(this);
        if (test === true) {
            return this.evalBlockStatement(s.trueStatementList);
        }
        else {
            return s.falseStatementList.accept(this);
        }
    };
    Interpreter.prototype.evalBlockStatement = function (sl) {
        this.pushEnvironment();
        var r = sl.accept(this);
        this.popEnvironment();
        return r;
    };
    Interpreter.prototype.visitFunctionCallNode = function (e) {
        var fd = this.env.lookup(e.functionId.name);
        return this.replicator.replicate(fd, e.arguments.accept(this));
    };
    Interpreter.prototype.visitReplicationExpressionNode = function (fa) {
        return new types.ReplicatedExpression(fa.expression.accept(this), fa.replicationGuideList);
    };
    Interpreter.prototype.visitExpressionListNode = function (el) {
        var vs = [];
        while (el != undefined) {
            vs.push(el.head.accept(this));
            el = el.tail;
        }
        return vs;
    };
    Interpreter.prototype.visitAssignmentNode = function (s) {
        this.env.set(s.identifier.name, s.expression.accept(this));
    };
    Interpreter.prototype.visitFunctionDefinitionNode = function (fds) {
        // unpack the argument list 
        var il = fds.arguments;
        var val = [];
        while (il != undefined) {
            var t = il.head.type;
            val.push(new types.TypedArgument(il.head.name, t ? t.name : undefined));
            il = il.tail;
        }
        var fd;
        var env = this.env;
        var interpreter = this;
        function f() {
            var args = Array.prototype.slice.call(arguments);
            return interpreter.apply(fds, env, args);
        }
        fd = new types.TypedFunction(f, val, fds.identifier.name);
        this.env.set(fds.identifier.name, fd);
    };
    Interpreter.prototype.apply = function (fd, env, args) {
        env = new enviro.Environment(env);
        // bind the arguments in the scope 
        var i = 0;
        var il = fd.arguments;
        while (il != null) {
            env.set(il.head.name, args[i++]);
            il = il.tail;
        }
        ;
        var current = this.env;
        this.env = env;
        var r = fd.body.accept(this);
        this.env = current;
        return r;
    };
    Interpreter.prototype.visitImperativeBlockNode = function (node) { throw new Error("Not implemented"); };
    ;
    Interpreter.prototype.visitAssociativeBlockNode = function (node) { throw new Error("Not implemented"); };
    ;
    return Interpreter;
})();
exports.Interpreter = Interpreter;
