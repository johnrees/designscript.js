%{
    function record( node, state ){
        node.firstLine = state.first_line;
        node.lastLine = state.last_line;
        node.firstCol = state.first_column;
        node.lastCol = state.last_column;
        return node;
    }
%}

%right ASSIGN
%left OR
%nonassoc EQUALITY RCARET
%left PLUS MINUS
%left TIMES
%right NOT
%left DOT

%%

Program
	: StatementList ENDOFFILE
	{ return $1; }
	;

StatementList
	: Statement StatementList
	{ $$ = record( new yy.StatementListNode( $1, $2 ), @$); }
	|
	;

Statement 
	: FunctionDefinition 
	| Block
	| Assignment
	| FunctionCall
    | IfStatement
	| ReturnStatement
    ;

Block 	
    : LBRACE StatementList RBRACE
	{ $$ = $2; }
    ;

ReturnStatement
    : RETURN ASSIGN Expression SEMICOLON
	{ $$ = record( new yy.ReturnNode( $3 ), @$); }
	;

FunctionDefinition
	: DEF Identifier LPAREN al RPAREN LBRACE StatementList RBRACE
	{ $$ = record( new yy.FunctionDefinitionNode( $2, $4, $7), @$); }
	;

Assignment	
	: tIdentifier ASSIGN Expression SEMICOLON
	{ $$ = record( new yy.AssignmentNode( $1, $3 ), @$); }
    ;

IfStatement
	: IF LPAREN Expression RPAREN Block
	{ $$ = record( new yy.IfStatementNode( $3, $5 ), @$); }
	| IF LPAREN Expression RPAREN Block ELSE Statement
	{ $$ = record( new yy.IfStatementNode( $3, $5, $7 ), @$); }
	;

IdentifierList
    : TypedIdentifier COMMA IdentifierList
	{ $$ = record( new yy.IdentifierListNode( $1, $3 ), @$); }
	| TypedIdentifier
	{ $$ = record( new yy.IdentifierListNode( $1 ), @$); }
	|
	;

Identifier
	: ID
	{ $$ = record( new yy.IdentifierNode($1), @$); }
	;

TypedIdentifier
	: Identifier
	| ID COLON Type
	{ $$ = record( new yy.TypedIdentifierNode( $1, $3 ), @$); }
	;

Type
	: ID
	{ $$ = record( new yy.Type( $1 ), @$); }
	| ID LBRACKET RBRACKET
	{ $$ = record( new yy.Type( $1 ), @$); }
	;

ExpressionList 
	: Expression COMMA ExpressionList
	{ $$ = record( new yy.ExpressionListNode($1, $3), @$); }
	| Expression
	{ $$ = record( new yy.ExpressionListNode($1), @$); }	
	|
    ;

Expression
	: Literal
	| Identifier
    | FunctionCall
    | Expression ReplicationGuideList
	{ $$ = record( new yy.ReplicatedExpressionNode($1, $2), @$); }
	| Expression PLUS Expression
	{ $$ = record( new yy.BinaryExpressionNode($2 ,$1, $3), @$); }
	| Expression MINUS Expression
	{ $$ = record( new yy.BinaryExpressionNode($2 ,$1, $3), @$); }
	| Expression TIMES Expression
	{ $$ = record( new yy.BinaryExpressionNode($2, $1, $3), @$); }
	| Expression EQUALITY Expression
	{ $$ = record( new yy.BinaryExpressionNode($2, $1, $3), @$); }
	| Expression RCARET Expression
	{ $$ = record( new yy.BinaryExpressionNode($2, $1, $3), @$); }
	| Expression OR Expression
	{ $$ = record( new yy.BinaryExpressionNode($2, $1, $3), @$); }
	| LPAREN Expression RPAREN
	{ $$ = $2; }
	| Identifier LBRACKET Expression RBRACKET
	{ $$ = record( new yy.ArrayIndexNode( $1, $3 ), @$); }	
	;

ReplicationGuide
    : LCARET Expression RCARET
	{ $$ = record( new yy.ReplicatedGuide( $2 ), @$); }
    ;

ReplicationGuideList
    : ReplicationGuide
	{ $$ = record( new yy.ReplicationGuideListNode( $1 ), @$); }
    | ReplicationGuide ReplicationGuideList
	{ $$ = record( new yy.ReplicationGuideListNode( $1, $2 ), @$); }
    ;

FunctionCall
    : Identifier LPAREN ExpressionList RPAREN
	{ $$ = record( new yy.FunctionCallNode($1, $3), @$); }
    ;

Literal	
	: INT
	{ $$ = record( new yy.IntNode( $1 ), @$); }
	| TRUE
	{ $$ = record( new yy.BooleanNode( $1 ), @$); }
	| FALSE
	{ $$ = record( new yy.BooleanNode( $1 ), @$); }
	| STRING
	{ $$ = record( new yy.StringNode( $1 ), @$); }
	| LBRACE ExpressionList RBRACE
	{ $$ = record( new yy.ArrayNode( $2 ), @$); }
	;
