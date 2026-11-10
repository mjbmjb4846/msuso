/**
 * Circuit Lab - Digital Logic Practice & Minimization Tool
 * Michigan State University Science Olympiad
 * 
 * 100% Client-Side Static Application
 * Features:
 * - Random digital logic statement generation across 4 difficulty tiers
 * - Configurable gate sets (AND, OR, NOT, XOR, NAND, NOR, XNOR)
 * - Selectable inputs (2-10 variables: A through J)
 * - Multi-notation display (Verbal, Boolean Algebra, C-Style, Bitwise)
 * - Interactive equation input with cursor placement, selection wrapping, & undo/redo
 * - Built-in Quine-McCluskey & Petrick minimal solver
 * - Truth-table equivalence checker with counterexamples & % simplified scoring
 */

// ============================================================================
// 1. Digital Logic Engine (Parser, Evaluator, Minimizer, Formatter)
// ============================================================================

class DigitalLogicEngine {
  static ALL_VARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Tokenize input string
  static tokenize(str) {
    const tokens = [];
    let i = 0;
    const s = str.trim();

    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (ch === '(' || ch === ')') {
        tokens.push({ type: 'PAREN', value: ch });
        i++;
      } else if (ch === "'") {
        tokens.push({ type: 'POSTFIX_NOT', value: "'" });
        i++;
      } else if (ch === '0' || ch === '1') {
        tokens.push({ type: 'CONST', value: parseInt(ch, 10) });
        i++;
      } else if (/[a-zA-Z]/.test(ch)) {
        let name = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
          name += s[i];
          i++;
        }
        const upper = name.toUpperCase();
        if (upper === 'AND') tokens.push({ type: 'AND' });
        else if (upper === 'OR') tokens.push({ type: 'OR' });
        else if (upper === 'NOT') tokens.push({ type: 'PREFIX_NOT' });
        else if (upper === 'XOR') tokens.push({ type: 'XOR' });
        else if (upper === 'NAND') tokens.push({ type: 'NAND' });
        else if (upper === 'NOR') tokens.push({ type: 'NOR' });
        else if (upper === 'XNOR') tokens.push({ type: 'XNOR' });
        else if (upper === 'TRUE') tokens.push({ type: 'CONST', value: 1 });
        else if (upper === 'FALSE') tokens.push({ type: 'CONST', value: 0 });
        else {
          // Sequence of letter variables like "AB" -> "A", "B"
          for (let k = 0; k < upper.length; k++) {
            tokens.push({ type: 'VAR', value: upper[k] });
          }
        }
      } else if (ch === '!' || ch === '~' || ch === '¬') {
        if (i + 1 < s.length && s[i+1] === '&') { tokens.push({ type: 'NAND' }); i += 2; }
        else if (i + 1 < s.length && s[i+1] === '|') { tokens.push({ type: 'NOR' }); i += 2; }
        else if (i + 1 < s.length && s[i+1] === '^') { tokens.push({ type: 'XNOR' }); i += 2; }
        else { tokens.push({ type: 'PREFIX_NOT' }); i++; }
      } else if (ch === '&') {
        if (i + 1 < s.length && s[i+1] === '&') i++;
        tokens.push({ type: 'AND' });
        i++;
      } else if (ch === '*' || ch === '·' || ch === '∧') {
        tokens.push({ type: 'AND' });
        i++;
      } else if (ch === '|') {
        if (i + 1 < s.length && s[i+1] === '|') i++;
        tokens.push({ type: 'OR' });
        i++;
      } else if (ch === '+' || ch === '∨') {
        tokens.push({ type: 'OR' });
        i++;
      } else if (ch === '^' || ch === '⊕') {
        tokens.push({ type: 'XOR' });
        i++;
      } else if (ch === '⊙') {
        tokens.push({ type: 'XNOR' });
        i++;
      } else {
        throw new Error(`Unexpected character: '${ch}'`);
      }
    }
    return tokens;
  }

  // Insert implicit AND tokens (e.g. A B -> A AND B, A(B+C) -> A AND (B+C), A'B -> A' AND B)
  static insertImplicitAnd(tokens) {
    const res = [];
    for (let i = 0; i < tokens.length; i++) {
      res.push(tokens[i]);
      if (i + 1 < tokens.length) {
        const curr = tokens[i];
        const next = tokens[i+1];
        const currCanEnd = (curr.type === 'VAR' || curr.type === 'CONST' || curr.type === 'POSTFIX_NOT' || (curr.type === 'PAREN' && curr.value === ')'));
        const nextCanStart = (next.type === 'VAR' || next.type === 'CONST' || next.type === 'PREFIX_NOT' || (next.type === 'PAREN' && next.value === '('));
        if (currCanEnd && nextCanStart) {
          res.push({ type: 'AND' });
        }
      }
    }
    return res;
  }

  // Parse expression string into an AST
  static parse(exprStr) {
    if (!exprStr || !exprStr.trim()) throw new Error('Please enter an expression');
    const rawTokens = DigitalLogicEngine.tokenize(exprStr);
    const tokens = DigitalLogicEngine.insertImplicitAnd(rawTokens);
    let pos = 0;

    function parseExpression(minPrec = 1) {
      let left = parsePrimary();

      while (pos < tokens.length && tokens[pos].type === 'POSTFIX_NOT') {
        pos++;
        left = { type: 'NOT', child: left };
      }

      while (pos < tokens.length) {
        const t = tokens[pos];
        let prec = 0;
        let opType = t.type;
        if (t.type === 'OR' || t.type === 'NOR') prec = 1;
        else if (t.type === 'XOR' || t.type === 'XNOR') prec = 2;
        else if (t.type === 'AND' || t.type === 'NAND') prec = 3;

        if (prec < minPrec) break;
        pos++;
        const right = parseExpression(prec + 1);
        left = { type: opType, left, right };

        while (pos < tokens.length && tokens[pos].type === 'POSTFIX_NOT') {
          pos++;
          left = { type: 'NOT', child: left };
        }
      }
      return left;
    }

    function parsePrimary() {
      const t = tokens[pos++];
      if (!t) throw new Error('Unexpected end of expression');
      if (t.type === 'VAR') return { type: 'VAR', name: t.value };
      if (t.type === 'CONST') return { type: 'CONST', value: t.value };
      if (t.type === 'PREFIX_NOT') {
        const child = parsePrimary();
        let res = { type: 'NOT', child };
        while (pos < tokens.length && tokens[pos].type === 'POSTFIX_NOT') {
          pos++;
          res = { type: 'NOT', child: res };
        }
        return res;
      }
      if (t.type === 'PAREN' && t.value === '(') {
        const expr = parseExpression(1);
        const close = tokens[pos++];
        if (!close || close.type !== 'PAREN' || close.value !== ')') throw new Error("Missing closing ')'");
        return expr;
      }
      throw new Error(`Unexpected token '${t.type}'`);
    }

    const ast = parseExpression(1);
    if (pos < tokens.length) throw new Error(`Unexpected token '${tokens[pos].type}'`);
    return ast;
  }

  // Evaluate AST recursively for a specific variable assignment
  static evaluate(ast, env) {
    switch (ast.type) {
      case 'VAR': return env[ast.name] ? 1 : 0;
      case 'CONST': return ast.value ? 1 : 0;
      case 'NOT': return DigitalLogicEngine.evaluate(ast.child, env) ? 0 : 1;
      case 'AND': return (DigitalLogicEngine.evaluate(ast.left, env) && DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      case 'OR': return (DigitalLogicEngine.evaluate(ast.left, env) || DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      case 'XOR': return (DigitalLogicEngine.evaluate(ast.left, env) ^ DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      case 'NAND': return !(DigitalLogicEngine.evaluate(ast.left, env) && DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      case 'NOR': return !(DigitalLogicEngine.evaluate(ast.left, env) || DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      case 'XNOR': return (DigitalLogicEngine.evaluate(ast.left, env) === DigitalLogicEngine.evaluate(ast.right, env)) ? 1 : 0;
      default: throw new Error(`Unknown node: ${ast.type}`);
    }
  }

  // Generate truth table for given AST across variables
  static getTruthTable(ast, vars) {
    const n = vars.length;
    const total = 1 << n;
    const table = new Uint8Array(total);
    const env = {};
    for (let i = 0; i < total; i++) {
      for (let j = 0; j < n; j++) {
        env[vars[j]] = (i >> (n - 1 - j)) & 1;
      }
      table[i] = DigitalLogicEngine.evaluate(ast, env);
    }
    return table;
  }

  // Expression Cost / Complexity: Literal count + Gate count
  static getComplexity(ast) {
    if (!ast) return 0;
    if (ast.type === 'VAR' || ast.type === 'CONST') return 1;
    if (ast.type === 'NOT') return 1 + DigitalLogicEngine.getComplexity(ast.child);
    return 1 + DigitalLogicEngine.getComplexity(ast.left) + DigitalLogicEngine.getComplexity(ast.right);
  }

  // Quine-McCluskey & Petrick's Method Minimizer for SOP
  static minimizeSOP(minterms, numVars, varNames) {
    if (minterms.length === 0) return { ast: { type: 'CONST', value: 0 }, terms: [], cost: 1 };
    if (minterms.length === (1 << numVars)) return { ast: { type: 'CONST', value: 1 }, terms: [], cost: 1 };

    let groups = {};
    for (let m of minterms) {
      let bin = m.toString(2).padStart(numVars, '0');
      let count = (bin.match(/1/g) || []).length;
      if (!groups[count]) groups[count] = [];
      groups[count].push({ term: bin, minterms: [m], used: false });
    }

    let primeImplicants = [];

    while (Object.keys(groups).length > 0) {
      let nextGroups = {};
      let keys = Object.keys(groups).map(Number).sort((a, b) => a - b);

      for (let i = 0; i < keys.length - 1; i++) {
        let g1 = keys[i];
        let g2 = keys[i+1];
        if (g2 !== g1 + 1) continue;

        for (let item1 of groups[g1]) {
          for (let item2 of groups[g2]) {
            let diffPos = -1;
            let diffCount = 0;
            for (let b = 0; b < numVars; b++) {
              if (item1.term[b] !== item2.term[b]) {
                diffCount++;
                diffPos = b;
              }
            }
            if (diffCount === 1) {
              item1.used = true;
              item2.used = true;
              let combinedTerm = item1.term.substring(0, diffPos) + '-' + item1.term.substring(diffPos + 1);
              let combinedMinterms = Array.from(new Set([...item1.minterms, ...item2.minterms])).sort((a,b)=>a-b);
              let cCount = (combinedTerm.match(/1/g) || []).length;
              if (!nextGroups[cCount]) nextGroups[cCount] = [];
              if (!nextGroups[cCount].some(e => e.term === combinedTerm)) {
                nextGroups[cCount].push({ term: combinedTerm, minterms: combinedMinterms, used: false });
              }
            }
          }
        }
      }

      for (let k of keys) {
        for (let item of groups[k]) {
          if (!item.used && !primeImplicants.some(p => p.term === item.term)) {
            primeImplicants.push(item);
          }
        }
      }
      groups = nextGroups;
    }

    let essentialPIs = [];
    let uncoveredMinterms = new Set(minterms);
    let table = {};
    for (let m of minterms) {
      table[m] = primeImplicants.filter(pi => pi.minterms.includes(m));
    }
    for (let m of minterms) {
      if (table[m] && table[m].length === 1) {
        let pi = table[m][0];
        if (!essentialPIs.includes(pi)) essentialPIs.push(pi);
      }
    }
    for (let pi of essentialPIs) {
      for (let m of pi.minterms) uncoveredMinterms.delete(m);
    }

    let chosenPIs = [...essentialPIs];
    if (uncoveredMinterms.size > 0) {
      let remainingPIs = primeImplicants.filter(pi => !essentialPIs.includes(pi));
      let remainingMinterms = Array.from(uncoveredMinterms);
      let bestCombination = null;
      let minTermsCount = Infinity;
      let minLiteralsCount = Infinity;

      function search(idx, currentSelection, covered) {
        if (remainingMinterms.every(m => covered.has(m))) {
          let litCount = currentSelection.reduce((acc, pi) => acc + (numVars - (pi.term.match(/-/g) || []).length), 0);
          if (currentSelection.length < minTermsCount || (currentSelection.length === minTermsCount && litCount < minLiteralsCount)) {
            minTermsCount = currentSelection.length;
            minLiteralsCount = litCount;
            bestCombination = [...currentSelection];
          }
          return;
        }
        if (idx >= remainingPIs.length || currentSelection.length >= minTermsCount) return;

        let nextCovered = new Set(covered);
        for (let m of remainingPIs[idx].minterms) nextCovered.add(m);
        currentSelection.push(remainingPIs[idx]);
        search(idx + 1, currentSelection, nextCovered);
        currentSelection.pop();
        search(idx + 1, currentSelection, covered);
      }

      search(0, [], new Set(essentialPIs.flatMap(pi => pi.minterms)));
      if (bestCombination) chosenPIs.push(...bestCombination);
    }

    const ast = DigitalLogicEngine.termsToSOPAST(chosenPIs.map(p => p.term), varNames);
    return {
      ast,
      terms: chosenPIs.map(p => p.term),
      cost: DigitalLogicEngine.getComplexity(ast)
    };
  }

  // Convert binary product term to AST
  static termToAST(term, varNames) {
    let literals = [];
    for (let i = 0; i < term.length; i++) {
      if (term[i] === '1') {
        literals.push({ type: 'VAR', name: varNames[i] });
      } else if (term[i] === '0') {
        literals.push({ type: 'NOT', child: { type: 'VAR', name: varNames[i] } });
      }
    }
    if (literals.length === 0) return { type: 'CONST', value: 1 };
    let cur = literals[0];
    for (let i = 1; i < literals.length; i++) {
      cur = { type: 'AND', left: cur, right: literals[i] };
    }
    return cur;
  }

  // Convert list of terms to SOP AST
  static termsToSOPAST(terms, varNames) {
    if (terms.length === 0) return { type: 'CONST', value: 0 };
    if (terms.length === 1 && terms[0] === '0') return { type: 'CONST', value: 0 };
    if (terms.length === 1 && terms[0] === '1') return { type: 'CONST', value: 1 };
    const productNodes = terms.map(t => DigitalLogicEngine.termToAST(t, varNames));
    let cur = productNodes[0];
    for (let i = 1; i < productNodes.length; i++) {
      cur = { type: 'OR', left: cur, right: productNodes[i] };
    }
    return cur;
  }

  // Check for minimal XOR/parity representation if XOR is enabled
  static checkXORForm(truthTable, vars) {
    const n = vars.length;
    const total = 1 << n;
    
    // Check parity of subsets of variables
    for (let mask = 1; mask < total; mask++) {
      const activeSubset = [];
      for (let j = 0; j < n; j++) {
        if ((mask >> (n - 1 - j)) & 1) activeSubset.push(vars[j]);
      }
      if (activeSubset.length < 2) continue;

      let isMatchDirect = true;
      let isMatchInverted = true;

      for (let i = 0; i < total; i++) {
        let parity = 0;
        for (let j = 0; j < n; j++) {
          if ((mask >> (n - 1 - j)) & 1) {
            parity ^= (i >> (n - 1 - j)) & 1;
          }
        }
        if (parity !== truthTable[i]) isMatchDirect = false;
        if ((parity ^ 1) !== truthTable[i]) isMatchInverted = false;
        if (!isMatchDirect && !isMatchInverted) break;
      }

      if (isMatchDirect || isMatchInverted) {
        let cur = { type: 'VAR', name: activeSubset[0] };
        for (let k = 1; k < activeSubset.length; k++) {
          cur = { type: 'XOR', left: cur, right: { type: 'VAR', name: activeSubset[k] } };
        }
        if (isMatchInverted) {
          cur = { type: 'NOT', child: cur };
        }
        return {
          ast: cur,
          cost: DigitalLogicEngine.getComplexity(cur)
        };
      }
    }
    return null;
  }

  // Find overall simplest solution (comparing SOP, POS, and XOR)
  static findSimplestSolution(truthTable, vars, enabledGates) {
    const numVars = vars.length;
    const minterms = [];
    const maxterms = [];
    for (let i = 0; i < truthTable.length; i++) {
      if (truthTable[i] === 1) minterms.push(i);
      else maxterms.push(i);
    }

    // 1. SOP Solution
    const sopResult = DigitalLogicEngine.minimizeSOP(minterms, numVars, vars);
    let best = { ast: sopResult.ast, cost: sopResult.cost };

    // 2. XOR Solution (if XOR gate is enabled)
    if (enabledGates.includes('XOR')) {
      const xorResult = DigitalLogicEngine.checkXORForm(truthTable, vars);
      if (xorResult && xorResult.cost < best.cost) {
        best = xorResult;
      }
    }

    return best;
  }

  // Format AST into clean string for chosen display notation
  static formatAST(ast, format = 'words') {
    if (!ast) return '';
    const getPrec = (node) => {
      if (!node) return 99;
      if (node.type === 'VAR' || node.type === 'CONST') return 99;
      if (node.type === 'NOT') return 4;
      if (node.type === 'AND' || node.type === 'NAND') return 3;
      if (node.type === 'XOR' || node.type === 'XNOR') return 2;
      if (node.type === 'OR' || node.type === 'NOR') return 1;
      return 0;
    };

    function rec(node, parentPrec = 0) {
      if (!node) return '';
      if (node.type === 'VAR') return node.name;
      if (node.type === 'CONST') return node.value.toString();

      if (node.type === 'NOT') {
        const inner = rec(node.child, 4);
        if (format === 'words') {
          return node.child.type === 'VAR' ? `NOT ${inner}` : `NOT(${inner})`;
        } else if (format === 'c_style') {
          return node.child.type === 'VAR' ? `!${inner}` : `!(${inner})`;
        } else if (format === 'bitwise') {
          return node.child.type === 'VAR' ? `~${inner}` : `~(${inner})`;
        } else { // algebra
          return node.child.type === 'VAR' ? `${inner}'` : `(${inner})'`;
        }
      }

      const myPrec = getPrec(node);
      const leftStr = rec(node.left, myPrec);
      const rightStr = rec(node.right, myPrec + 1);

      let opStr = '';
      if (format === 'words') {
        opStr = ` ${node.type} `;
      } else if (format === 'c_style') {
        const ops = { AND: ' && ', OR: ' || ', XOR: ' ^ ', NAND: ' !&& ', NOR: ' !|| ', XNOR: ' !^ ' };
        opStr = ops[node.type] || ` ${node.type} `;
      } else if (format === 'bitwise') {
        const ops = { AND: ' & ', OR: ' | ', XOR: ' ^ ', NAND: ' ~& ', NOR: ' ~| ', XNOR: ' ~^ ' };
        opStr = ops[node.type] || ` ${node.type} `;
      } else { // algebra
        const ops = { AND: ' · ', OR: ' + ', XOR: ' ⊕ ', NAND: ' ↑ ', NOR: ' ↓ ', XNOR: ' ⊙ ' };
        opStr = ops[node.type] || ` ${node.type} `;
      }

      const res = `${leftStr}${opStr}${rightStr}`;
      return (myPrec < parentPrec) ? `(${res})` : res;
    }

    return rec(ast, 0);
  }

  // Generate a random problem matching difficulty, variable count, and active gates
  static generateProblem({ numVars = 3, difficulty = 'easy', enabledGates = ['AND', 'OR', 'NOT'] }) {
    const letters = DigitalLogicEngine.ALL_VARS.slice(0, numVars);
    
    // Determine active variables for this problem based on difficulty
    let activeCount = Math.min(letters.length, 
      difficulty === 'easy' ? Math.min(3, letters.length) :
      difficulty === 'medium' ? Math.min(4, letters.length) :
      difficulty === 'hard' ? Math.min(5, letters.length) :
      Math.min(7, letters.length)
    );
    if (activeCount < 2) activeCount = 2;
    const activeVars = letters.slice(0, activeCount);

    function randVar() {
      return activeVars[Math.floor(Math.random() * activeVars.length)];
    }

    function randLiteral() {
      const v = randVar();
      if (enabledGates.includes('NOT') && Math.random() < 0.35) {
        return { type: 'NOT', child: { type: 'VAR', name: v } };
      }
      return { type: 'VAR', name: v };
    }

    // Build random base tree
    function buildRandomTree(depth) {
      if (depth <= 1 || Math.random() < 0.2) {
        return randLiteral();
      }
      const binaryGates = enabledGates.filter(g => g !== 'NOT');
      const op = binaryGates[Math.floor(Math.random() * binaryGates.length)] || 'AND';
      return {
        type: op,
        left: buildRandomTree(depth - 1),
        right: buildRandomTree(depth - 1)
      };
    }

    // Expand tree with algebraic redundancies
    function expandWithRedundancy(node, steps) {
      if (steps <= 0) return node;
      const v = randVar();
      const binaryGates = enabledGates.filter(g => g !== 'NOT');
      const hasOr = binaryGates.includes('OR');
      const hasAnd = binaryGates.includes('AND');
      const hasNot = enabledGates.includes('NOT');
      const rule = Math.floor(Math.random() * 6);

      let nextNode = node;
      if (rule === 0 && hasOr && hasAnd) {
        // Absorption: X -> X OR (X AND Y)
        nextNode = {
          type: 'OR',
          left: node,
          right: { type: 'AND', left: JSON.parse(JSON.stringify(node)), right: { type: 'VAR', name: v } }
        };
      } else if (rule === 1 && hasOr && hasAnd && hasNot) {
        // Complementation: X -> X AND (Y OR NOT Y)
        nextNode = {
          type: 'AND',
          left: node,
          right: {
            type: 'OR',
            left: { type: 'VAR', name: v },
            right: { type: 'NOT', child: { type: 'VAR', name: v } }
          }
        };
      } else if (rule === 2 && hasOr && hasAnd) {
        // X -> X AND (X OR Y)
        nextNode = {
          type: 'AND',
          left: node,
          right: { type: 'OR', left: JSON.parse(JSON.stringify(node)), right: { type: 'VAR', name: v } }
        };
      } else if (rule === 3 && hasNot && (hasAnd || hasOr)) {
        // De Morgan
        if (node.type === 'AND' && hasOr) {
          nextNode = {
            type: 'NOT',
            child: {
              type: 'OR',
              left: { type: 'NOT', child: node.left },
              right: { type: 'NOT', child: node.right }
            }
          };
        } else if (node.type === 'OR' && hasAnd) {
          nextNode = {
            type: 'NOT',
            child: {
              type: 'AND',
              left: { type: 'NOT', child: node.left },
              right: { type: 'NOT', child: node.right }
            }
          };
        }
      } else if (rule === 4 && hasOr) {
        // Idempotence: X -> X OR X
        nextNode = { type: 'OR', left: node, right: JSON.parse(JSON.stringify(node)) };
      } else if (hasAnd) {
        // X -> X AND X
        nextNode = { type: 'AND', left: node, right: JSON.parse(JSON.stringify(node)) };
      }

      return expandWithRedundancy(nextNode, steps - 1);
    }

    // Try up to 25 times to generate a non-trivial, simplifiable statement
    for (let attempt = 0; attempt < 25; attempt++) {
      const depth = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 4 : 5;
      const steps = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4;
      const base = buildRandomTree(depth);
      const generatedAST = expandWithRedundancy(base, steps);

      const tt = DigitalLogicEngine.getTruthTable(generatedAST, activeVars);
      const ones = tt.reduce((acc, v) => acc + v, 0);

      // Avoid constant 0 or constant 1
      if (ones === 0 || ones === tt.length) continue;

      const origCost = DigitalLogicEngine.getComplexity(generatedAST);
      const simplest = DigitalLogicEngine.findSimplestSolution(tt, activeVars, enabledGates);

      // Ensure statement can actually be simplified
      if (origCost > simplest.cost) {
        return {
          ast: generatedAST,
          vars: activeVars,
          truthTable: tt,
          origCost,
          simplest
        };
      }
    }

    // Fallback guaranteed simplifiable statement: (A AND B) OR (A AND NOT B)
    const fallbackAST = {
      type: 'OR',
      left: { type: 'AND', left: { type: 'VAR', name: 'A' }, right: { type: 'VAR', name: 'B' } },
      right: { type: 'AND', left: { type: 'VAR', name: 'A' }, right: { type: 'NOT', child: { type: 'VAR', name: 'B' } } }
    };
    const fbVars = activeVars.slice(0, 2);
    const fbTT = DigitalLogicEngine.getTruthTable(fallbackAST, fbVars);
    const fbSimplest = DigitalLogicEngine.findSimplestSolution(fbTT, fbVars, enabledGates);
    return {
      ast: fallbackAST,
      vars: fbVars,
      truthTable: fbTT,
      origCost: DigitalLogicEngine.getComplexity(fallbackAST),
      simplest: fbSimplest
    };
  }
}

// ============================================================================
// 2. Circuit Lab Practice UI Controller
// ============================================================================

class CircuitLabGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Available gates & defaults: AND, OR, NOT enabled by default
    this.allGates = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];
    this.enabledGates = new Set(['AND', 'OR', 'NOT']);

    // State settings
    this.difficulty = 'easy';
    this.numVars = 3;
    this.displayFormat = 'words'; // 'words', 'algebra', 'c_style', 'bitwise'

    // Game stats
    this.currentProblem = null;
    this.solvedCount = 0;
    this.currentStreak = 0;
    this.timerSeconds = 0;
    this.timerInterval = null;

    // Undo / Redo history for interactive input
    this.history = [];
    this.historyIndex = -1;

    this.renderSkeleton();
    this.bindEvents();
    this.checkSvgGateIcons();
    this.startTimer();
    this.newProblem();
  }

  // Render initial UI layout
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="circuit-container">
        <!-- Header -->
        <div class="circuit-header">
          <div class="circuit-info">
            <h2>
              <ion-icon name="hardware-chip-outline" style="color: var(--color-primary);"></ion-icon>
              Digital Logic Practice
            </h2>
            <p class="subtitle">Science Olympiad Circuit Lab &bull; Boolean Algebra Minimization Trainer</p>
          </div>
          
          <div class="circuit-controls">
            <div class="streak-display">
              <div class="streak-label">Streak</div>
              <div class="streak-value" id="circuitStreakVal">0</div>
            </div>
            <div class="timer-display">
              <div class="timer-label">Timer</div>
              <div class="timer-time" id="circuitTimerVal">00:00</div>
            </div>
          </div>
        </div>

        <!-- Configuration Bar -->
        <div class="circuit-config-bar">
          <div class="config-group">
            <label for="circuitDifficultySelect">Difficulty:</label>
            <select id="circuitDifficultySelect">
              <option value="easy" selected>Easy (2-3 Vars)</option>
              <option value="medium">Medium (3-4 Vars)</option>
              <option value="hard">Hard (4-5 Vars)</option>
              <option value="challenge">Challenge (5+ Vars)</option>
            </select>
          </div>

          <div class="config-group">
            <label for="circuitInputsSelect">Inputs:</label>
            <select id="circuitInputsSelect">
              <option value="2">2 (A, B)</option>
              <option value="3" selected>3 (A, B, C)</option>
              <option value="4">4 (A, B, C, D)</option>
              <option value="5">5 (A, B, C, D, E)</option>
              <option value="6">6 (A-F)</option>
              <option value="7">7 (A-G)</option>
              <option value="8">8 (A-H)</option>
              <option value="9">9 (A-I)</option>
              <option value="10">10 (A-J)</option>
            </select>
          </div>

          <div class="config-group">
            <label for="circuitFormatSelect">Notation Style:</label>
            <select id="circuitFormatSelect">
              <option value="words" selected>Textual / Words (AND, OR, NOT)</option>
              <option value="algebra">Boolean Algebra / Math (·, +, ')</option>
              <option value="c_style">C Coding Style (&&, ||, !)</option>
              <option value="bitwise">Bitwise / HDL (&, |, ~)</option>
            </select>
          </div>
        </div>

        <!-- Logic Gates Selector Panel -->
        <div class="gate-selector-section">
          <div class="gate-selector-header">
            <h3>Active Logic Gates</h3>
            <span class="gate-selector-hint">Toggle buttons illuminate when active &bull; Click to enable or disable</span>
          </div>
          <div class="gate-toggles-grid" id="circuitGateToggles">
            ${this.allGates.map(gate => {
              const isActive = this.enabledGates.has(gate);
              return `
                <button type="button" class="gate-toggle-btn ${isActive ? 'active' : ''}" data-gate="${gate}" title="Toggle ${gate} gate">
                  <span class="gate-indicator-dot"></span>
                  <img class="gate-icon-svg" src="../../assets/circuit-lab/${gate.toLowerCase()}.svg" alt="${gate}" />
                  <span class="gate-name-text">${gate}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Problem Statement Card -->
        <div class="problem-card">
          <div class="problem-card-header">
            <span class="problem-card-title">
              <ion-icon name="code-working-outline"></ion-icon>
              Simplify This Digital Logic Statement
            </span>
            <div class="problem-badges">
              <span class="badge badge-primary" id="problemDifficultyBadge">Easy</span>
              <span class="badge badge-cost" id="problemOrigCostBadge">Complexity: --</span>
            </div>
          </div>
          <div class="problem-display-box" id="problemDisplayBox">Loading problem...</div>
        </div>

        <!-- Interactive Workspace & Input Card -->
        <div class="workspace-card">
          <div class="workspace-header">
            <span class="workspace-title">Your Simplified Expression</span>
            <span class="selection-hint">💡 Tip: Highlight text with your mouse and click "( ) Wrap" or "NOT( )" to enclose!</span>
          </div>

          <!-- Main Input Field -->
          <div class="input-field-wrapper">
            <input type="text" id="circuitUserInput" class="expression-input" placeholder="Type or click keypad buttons below to build your simplified expression..." autocomplete="off" spellcheck="false" />
          </div>

          <!-- Live Formatted Preview Card -->
          <div class="live-preview-box">
            <div class="live-preview-content" id="circuitLivePreview">Preview: --</div>
            <div class="live-preview-status" id="circuitLiveStatus">Ready</div>
          </div>

          <!-- Virtual Keypad -->
          <div class="keypad-container">
            <!-- Variables Row -->
            <div class="keypad-row">
              <span class="keypad-group-label">Inputs:</span>
              <div class="keypad-buttons-cluster" id="keypadVarsCluster"></div>
            </div>

            <!-- Operators Row -->
            <div class="keypad-row">
              <span class="keypad-group-label">Gates:</span>
              <div class="keypad-buttons-cluster" id="keypadOpsCluster"></div>
            </div>

            <!-- Parentheses & Wrapping Tools Row -->
            <div class="keypad-row">
              <span class="keypad-group-label">Enclose:</span>
              <div class="keypad-buttons-cluster">
                <button type="button" class="key-btn key-btn-paren" data-action="insert" data-val="(">(</button>
                <button type="button" class="key-btn key-btn-paren" data-action="insert" data-val=")">)</button>
                <button type="button" class="key-btn key-btn-wrap" data-action="wrap-parens" title="Wrap selection in parentheses">
                  ( ) Wrap
                </button>
                <button type="button" class="key-btn key-btn-wrap" data-action="wrap-not" title="Wrap selection in NOT">
                  NOT( ) Wrap
                </button>
                <button type="button" class="key-btn key-btn-op" data-action="insert" data-val="0">0</button>
                <button type="button" class="key-btn key-btn-op" data-action="insert" data-val="1">1</button>
              </div>
            </div>

            <!-- Editing Controls Row -->
            <div class="keypad-row">
              <span class="keypad-group-label">Edit:</span>
              <div class="keypad-buttons-cluster">
                <button type="button" class="key-btn key-btn-action" data-action="undo" title="Undo (Ctrl+Z)">↶ Undo</button>
                <button type="button" class="key-btn key-btn-action" data-action="redo" title="Redo (Ctrl+Y)">↷ Redo</button>
                <button type="button" class="key-btn key-btn-action" data-action="backspace" title="Backspace">⌫ Backspace</button>
                <button type="button" class="key-btn key-btn-action" data-action="clear" title="Clear input">🗑 Clear</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Primary Action Buttons -->
        <div class="circuit-action-bar">
          <button type="button" class="btn btn-primary" id="btnCheckSolution">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            Check Solution
          </button>
          <button type="button" class="btn btn-outline" id="btnNewProblem">
            <ion-icon name="refresh-outline"></ion-icon>
            New Expression
          </button>
          <button type="button" class="btn btn-outline" id="btnRevealSolution">
            <ion-icon name="bulb-outline"></ion-icon>
            Show Solution
          </button>
          <button type="button" class="btn btn-outline" id="btnToggleTruthTable">
            <ion-icon name="grid-outline"></ion-icon>
            Truth Table
          </button>
        </div>

        <!-- Results & Evaluation Panel -->
        <div class="results-panel" id="circuitResultsPanel">
          <div class="results-header">
            <div class="results-title" id="resultsTitle">Evaluation</div>
            <div class="results-pct-badge" id="resultsPctBadge">0% Simplified</div>
          </div>
          <div class="results-body" id="resultsBody"></div>
          <div class="results-stats-grid" id="resultsStatsGrid"></div>
          <div class="solution-reveal-card" id="resultsSolutionCard" style="display:none;">
            <div class="solution-reveal-label">Simplest Minimal Solution:</div>
            <div class="solution-reveal-expr" id="resultsSolutionExpr"></div>
          </div>
          <div class="counterexample-box" id="resultsCounterexampleBox" style="display:none;"></div>
        </div>

        <!-- Collapsible Truth Table Section -->
        <div class="truth-table-section" id="truthTableSection">
          <div class="truth-table-header">
            <h3>Complete Truth Table Comparison</h3>
            <span class="gate-selector-hint">Evaluates both expressions across all 2ⁿ input states</span>
          </div>
          <div class="truth-table-wrapper" id="truthTableWrapper"></div>
        </div>

        <!-- Digital Logic Reference Cheatsheet Accordion -->
        <div class="reference-accordion">
          <details>
            <summary class="reference-summary">
              <span>📘 Quick Reference: Boolean Algebra Laws & Theorems</span>
              <ion-icon name="chevron-down-outline"></ion-icon>
            </summary>
            <div class="reference-content">
              <div class="laws-grid">
                <div class="law-card">
                  <div class="law-card-title">Absorption Laws</div>
                  <div class="law-card-expr">A + (A · B) = A<br>A · (A + B) = A</div>
                </div>
                <div class="law-card-title-card law-card">
                  <div class="law-card-title">De Morgan's Theorems</div>
                  <div class="law-card-expr">(A · B)' = A' + B'<br>(A + B)' = A' · B'</div>
                </div>
                <div class="law-card">
                  <div class="law-card-title">Complement & Negation</div>
                  <div class="law-card-expr">A + A' = 1<br>A · A' = 0 &bull; (A')' = A</div>
                </div>
                <div class="law-card">
                  <div class="law-card-title">Consensus Theorem</div>
                  <div class="law-card-expr">AB + A'C + BC = AB + A'C<br>(A+B)(A'+C)(B+C) = (A+B)(A'+C)</div>
                </div>
                <div class="law-card">
                  <div class="law-card-title">Distributive Laws</div>
                  <div class="law-card-expr">A · (B + C) = AB + AC<br>A + (B · C) = (A + B)(A + C)</div>
                </div>
                <div class="law-card">
                  <div class="law-card-title">XOR Equivalencies</div>
                  <div class="law-card-expr">A ⊕ B = A'B + AB'<br>(A ⊕ B)' = AB + A'B' (XNOR)</div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  // Detect SVG availability in assets/circuit-lab/
  checkSvgGateIcons() {
    const btns = this.container.querySelectorAll('.gate-toggle-btn');
    btns.forEach(btn => {
      const img = btn.querySelector('.gate-icon-svg');
      if (img) {
        img.onload = () => img.classList.add('svg-loaded');
        img.onerror = () => img.classList.remove('svg-loaded');
      }
    });
  }

  // Bind event listeners to UI elements
  bindEvents() {
    // Gate toggle buttons
    const gateButtons = this.container.querySelectorAll('.gate-toggle-btn');
    gateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const gate = btn.getAttribute('data-gate');
        if (this.enabledGates.has(gate)) {
          // Prevent disabling all gates
          if (this.enabledGates.size <= 1) {
            alert('At least one logic gate must remain enabled!');
            return;
          }
          this.enabledGates.delete(gate);
          btn.classList.remove('active');
        } else {
          this.enabledGates.add(gate);
          btn.classList.add('active');
        }
        this.updateKeypad();
        this.newProblem();
      });
    });

    // Configuration selectors
    const diffSelect = document.getElementById('circuitDifficultySelect');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this.difficulty = e.target.value;
        this.newProblem();
      });
    }

    const inputsSelect = document.getElementById('circuitInputsSelect');
    if (inputsSelect) {
      inputsSelect.addEventListener('change', (e) => {
        this.numVars = parseInt(e.target.value, 10);
        this.updateKeypad();
        this.newProblem();
      });
    }

    const formatSelect = document.getElementById('circuitFormatSelect');
    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => {
        this.displayFormat = e.target.value;
        this.renderProblemDisplay();
        this.updateKeypad();
        this.updateLivePreview();
        if (this.currentProblem && this.currentProblem.simplest) {
          const solutionExpr = document.getElementById('resultsSolutionExpr');
          if (solutionExpr) {
            solutionExpr.textContent = DigitalLogicEngine.formatAST(this.currentProblem.simplest.ast, this.displayFormat);
          }
        }
      });
    }

    // Input field typing & interaction
    const inputEl = document.getElementById('circuitUserInput');
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        this.recordHistory(inputEl.value);
        this.updateLivePreview();
      });

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.checkSolution();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          this.undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          this.redo();
        }
      });
    }

    // Primary buttons
    document.getElementById('btnCheckSolution').addEventListener('click', () => this.checkSolution());
    document.getElementById('btnNewProblem').addEventListener('click', () => this.newProblem());
    document.getElementById('btnRevealSolution').addEventListener('click', () => this.revealSolution());
    document.getElementById('btnToggleTruthTable').addEventListener('click', () => this.toggleTruthTable());

    // Keypad delegated actions
    const keypadContainer = this.container.querySelector('.keypad-container');
    if (keypadContainer) {
      keypadContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.key-btn');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const val = btn.getAttribute('data-val');

        if (action === 'insert') {
          this.insertTextAtCursor(val);
        } else if (action === 'insert-op') {
          this.insertOperator(val);
        } else if (action === 'wrap-parens') {
          this.wrapSelection('(', ')');
        } else if (action === 'wrap-not') {
          this.wrapNot();
        } else if (action === 'backspace') {
          this.backspace();
        } else if (action === 'clear') {
          this.clearInput();
        } else if (action === 'undo') {
          this.undo();
        } else if (action === 'redo') {
          this.redo();
        }
      });
    }
  }

  // Update keypad buttons based on active variables, active gates, and notation style
  updateKeypad() {
    const varsCluster = document.getElementById('keypadVarsCluster');
    const opsCluster = document.getElementById('keypadOpsCluster');
    if (!varsCluster || !opsCluster) return;

    // Active variables
    const activeLetters = DigitalLogicEngine.ALL_VARS.slice(0, this.numVars);
    varsCluster.innerHTML = activeLetters.map(letter => `
      <button type="button" class="key-btn key-btn-var" data-action="insert" data-val="${letter}">${letter}</button>
    `).join('');

    // Operators mapping according to chosen display format
    const opDisplayMap = {
      words: { AND: 'AND', OR: 'OR', NOT: 'NOT', XOR: 'XOR', NAND: 'NAND', NOR: 'NOR', XNOR: 'XNOR' },
      algebra: { AND: '·', OR: '+', NOT: "'", XOR: '⊕', NAND: '↑', NOR: '↓', XNOR: '⊙' },
      c_style: { AND: '&&', OR: '||', NOT: '!', XOR: '^', NAND: '!&&', NOR: '!||', XNOR: '!^' },
      bitwise: { AND: '&', OR: '|', NOT: '~', XOR: '^', NAND: '~&', NOR: '~|', XNOR: '~^' }
    };
    const formatMap = opDisplayMap[this.displayFormat] || opDisplayMap.words;

    // Render active gates
    const activeGateList = this.allGates.filter(g => this.enabledGates.has(g));
    opsCluster.innerHTML = activeGateList.map(gate => {
      const label = formatMap[gate] || gate;
      return `<button type="button" class="key-btn key-btn-op" data-action="insert-op" data-val="${label}">${label}</button>`;
    }).join('');
  }

  // Text insertion & selection manipulation
  insertTextAtCursor(text) {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.focus();

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    const nextVal = current.substring(0, start) + text + current.substring(end);
    input.value = nextVal;
    input.setSelectionRange(start + text.length, start + text.length);

    this.recordHistory(nextVal);
    this.updateLivePreview();
  }

  insertOperator(op) {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.focus();

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    // Smart spacing for clean equations
    let toInsert = op;
    if (op !== "'" && op !== '!' && op !== '~') {
      const prevChar = start > 0 ? current[start - 1] : '';
      const nextChar = end < current.length ? current[end] : '';
      const leadingSpace = (start > 0 && prevChar !== ' ' && prevChar !== '(') ? ' ' : '';
      const trailingSpace = (end < current.length && nextChar !== ' ' && nextChar !== ')') ? ' ' : '';
      toInsert = `${leadingSpace}${op}${trailingSpace}`;
    }

    const nextVal = current.substring(0, start) + toInsert + current.substring(end);
    input.value = nextVal;
    input.setSelectionRange(start + toInsert.length, start + toInsert.length);

    this.recordHistory(nextVal);
    this.updateLivePreview();
  }

  // Highlight & Wrap feature for parentheses
  wrapSelection(openChar = '(', closeChar = ')') {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.focus();

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    if (start !== end) {
      // User has selected a chunk of their input
      const selectedText = current.substring(start, end);
      const wrapped = `${openChar}${selectedText}${closeChar}`;
      const nextVal = current.substring(0, start) + wrapped + current.substring(end);
      input.value = nextVal;
      // Retain the wrapped text inside selection
      input.setSelectionRange(start, start + wrapped.length);
    } else {
      // Nothing selected: insert () and place cursor in middle
      const wrapped = `${openChar}${closeChar}`;
      const nextVal = current.substring(0, start) + wrapped + current.substring(end);
      input.value = nextVal;
      input.setSelectionRange(start + 1, start + 1);
    }

    this.recordHistory(input.value);
    this.updateLivePreview();
  }

  // Highlight & Wrap feature for NOT gate
  wrapNot() {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.focus();

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    let notPrefix = 'NOT(';
    let notSuffix = ')';
    if (this.displayFormat === 'c_style') { notPrefix = '!('; notSuffix = ')'; }
    else if (this.displayFormat === 'bitwise') { notPrefix = '~('; notSuffix = ')'; }
    else if (this.displayFormat === 'algebra') { notPrefix = '('; notSuffix = ")'"; }

    if (start !== end) {
      const selectedText = current.substring(start, end);
      const wrapped = `${notPrefix}${selectedText}${notSuffix}`;
      const nextVal = current.substring(0, start) + wrapped + current.substring(end);
      input.value = nextVal;
      input.setSelectionRange(start, start + wrapped.length);
    } else {
      const wrapped = `${notPrefix}${notSuffix}`;
      const nextVal = current.substring(0, start) + wrapped + current.substring(end);
      input.value = nextVal;
      input.setSelectionRange(start + notPrefix.length, start + notPrefix.length);
    }

    this.recordHistory(input.value);
    this.updateLivePreview();
  }

  backspace() {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.focus();

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    if (start !== end) {
      input.value = current.substring(0, start) + current.substring(end);
      input.setSelectionRange(start, start);
    } else if (start > 0) {
      input.value = current.substring(0, start - 1) + current.substring(start);
      input.setSelectionRange(start - 1, start - 1);
    }

    this.recordHistory(input.value);
    this.updateLivePreview();
  }

  clearInput() {
    const input = document.getElementById('circuitUserInput');
    if (!input) return;
    input.value = '';
    input.focus();
    this.recordHistory('');
    this.updateLivePreview();
  }

  // Undo / Redo history management
  recordHistory(val) {
    if (this.history[this.historyIndex] === val) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(val);
    this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const val = this.history[this.historyIndex];
      const input = document.getElementById('circuitUserInput');
      if (input) {
        input.value = val;
        this.updateLivePreview();
      }
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const val = this.history[this.historyIndex];
      const input = document.getElementById('circuitUserInput');
      if (input) {
        input.value = val;
        this.updateLivePreview();
      }
    }
  }

  // Live expression preview & syntax validator
  updateLivePreview() {
    const input = document.getElementById('circuitUserInput');
    const previewEl = document.getElementById('circuitLivePreview');
    const statusEl = document.getElementById('circuitLiveStatus');
    if (!input || !previewEl || !statusEl) return;

    const text = input.value.trim();
    if (!text) {
      previewEl.textContent = 'Preview: (empty)';
      statusEl.textContent = 'Ready';
      statusEl.className = 'live-preview-status';
      return;
    }

    try {
      const ast = DigitalLogicEngine.parse(text);
      const formatted = DigitalLogicEngine.formatAST(ast, this.displayFormat);
      previewEl.textContent = `Preview: ${formatted}`;
      statusEl.textContent = '✓ Syntax Valid';
      statusEl.className = 'live-preview-status valid';
    } catch (err) {
      previewEl.textContent = `Raw: ${text}`;
      statusEl.textContent = `⚠️ ${err.message}`;
      statusEl.className = 'live-preview-status invalid';
    }
  }

  // Generate and display a new practice problem
  newProblem() {
    this.currentProblem = DigitalLogicEngine.generateProblem({
      numVars: this.numVars,
      difficulty: this.difficulty,
      enabledGates: Array.from(this.enabledGates)
    });

    this.renderProblemDisplay();
    this.clearInput();
    this.hideResults();
    this.resetTimer();

    // Hide truth table if open
    const ttSection = document.getElementById('truthTableSection');
    if (ttSection) ttSection.style.display = 'none';
  }

  // Render problem statement box
  renderProblemDisplay() {
    if (!this.currentProblem) return;
    const displayBox = document.getElementById('problemDisplayBox');
    const diffBadge = document.getElementById('problemDifficultyBadge');
    const costBadge = document.getElementById('problemOrigCostBadge');

    if (displayBox) {
      displayBox.textContent = DigitalLogicEngine.formatAST(this.currentProblem.ast, this.displayFormat);
    }
    if (diffBadge) {
      diffBadge.textContent = this.difficulty.toUpperCase();
    }
    if (costBadge) {
      costBadge.textContent = `Complexity: ${this.currentProblem.origCost}`;
    }
  }

  // Evaluate user solution against original problem & minimal solver
  checkSolution() {
    if (!this.currentProblem) return;
    const input = document.getElementById('circuitUserInput');
    const userText = input ? input.value.trim() : '';

    if (!userText) {
      alert('Please enter your simplified expression first!');
      return;
    }

    let userAST;
    try {
      userAST = DigitalLogicEngine.parse(userText);
    } catch (err) {
      alert(`Syntax Error: ${err.message}`);
      return;
    }

    const vars = this.currentProblem.vars;
    const userTT = DigitalLogicEngine.getTruthTable(userAST, vars);
    const origTT = this.currentProblem.truthTable;

    // 1. Check Equivalence across all 2ⁿ states
    let isEquivalent = true;
    let counterexample = null;

    for (let i = 0; i < origTT.length; i++) {
      if (userTT[i] !== origTT[i]) {
        isEquivalent = false;
        const env = {};
        for (let j = 0; j < vars.length; j++) {
          env[vars[j]] = (i >> (vars.length - 1 - j)) & 1;
        }
        counterexample = {
          env,
          origVal: origTT[i],
          userVal: userTT[i]
        };
        break;
      }
    }

    // 2. Measure complexity and simplification percentage
    const origCost = this.currentProblem.origCost;
    const userCost = DigitalLogicEngine.getComplexity(userAST);
    const minCost = this.currentProblem.simplest.cost;

    let pctSimplified = 0;
    if (isEquivalent) {
      if (origCost <= minCost) {
        pctSimplified = (userCost <= minCost) ? 100 : 0;
      } else {
        const reduction = origCost - userCost;
        const maxReduction = origCost - minCost;
        pctSimplified = Math.max(0, Math.min(100, Math.round((reduction / maxReduction) * 100)));
        if (userCost <= minCost) pctSimplified = 100;
      }
    }

    // 3. Display Results
    this.showResults({
      isEquivalent,
      counterexample,
      origCost,
      userCost,
      minCost,
      pctSimplified,
      userAST,
      userTT
    });

    if (isEquivalent) {
      this.solvedCount++;
      if (pctSimplified === 100) {
        this.currentStreak++;
      }
    } else {
      this.currentStreak = 0;
    }

    const streakVal = document.getElementById('circuitStreakVal');
    if (streakVal) streakVal.textContent = this.currentStreak;
  }

  // Display results card and feedback
  showResults({ isEquivalent, counterexample, origCost, userCost, minCost, pctSimplified, userAST, userTT }) {
    const panel = document.getElementById('circuitResultsPanel');
    const titleEl = document.getElementById('resultsTitle');
    const badgeEl = document.getElementById('resultsPctBadge');
    const bodyEl = document.getElementById('resultsBody');
    const statsGrid = document.getElementById('resultsStatsGrid');
    const solutionCard = document.getElementById('resultsSolutionCard');
    const solutionExpr = document.getElementById('resultsSolutionExpr');
    const counterBox = document.getElementById('resultsCounterexampleBox');

    if (!panel) return;
    panel.style.display = 'block';

    if (!isEquivalent) {
      panel.className = 'results-panel incorrect';
      titleEl.innerHTML = '<ion-icon name="close-circle"></ion-icon> Expressions Are Not Equivalent';
      badgeEl.textContent = '0% Simplified';
      badgeEl.style.color = '#ef4444';
      bodyEl.textContent = 'Your answer produces different outputs for one or more input combinations. Inspect the counterexample below:';
      
      const envStr = Object.entries(counterexample.env).map(([k, v]) => `${k} = ${v}`).join(', ');
      counterBox.style.display = 'block';
      counterBox.innerHTML = `<strong>Counterexample:</strong> When <code>${envStr}</code>, Original Expression = <strong>${counterexample.origVal}</strong>, but Your Expression = <strong>${counterexample.userVal}</strong>.`;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-label">Equivalence</div>
          <div class="stat-card-value" style="color:#ef4444;">No ✗</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Your Cost</div>
          <div class="stat-card-value">${userCost}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Original Cost</div>
          <div class="stat-card-value">${origCost}</div>
        </div>
      `;
      solutionCard.style.display = 'none';
    } else {
      counterBox.style.display = 'none';

      if (pctSimplified === 100) {
        panel.className = 'results-panel success';
        titleEl.innerHTML = '<ion-icon name="trophy"></ion-icon> Optimal Simplification!';
        badgeEl.textContent = '100% Simplified';
        badgeEl.style.color = '#15803d';
        bodyEl.textContent = 'Outstanding work! Your expression is completely simplified and matches the theoretical minimal gate count.';
      } else if (pctSimplified > 0) {
        panel.className = 'results-panel partial';
        titleEl.innerHTML = '<ion-icon name="alert-circle"></ion-icon> Logically Equivalent & Partially Simplified';
        badgeEl.textContent = `${pctSimplified}% Simplified`;
        badgeEl.style.color = '#b45309';
        bodyEl.textContent = `Correct logic! You reduced complexity from ${origCost} down to ${userCost}. However, it can be simplified further down to cost ${minCost}!`;
      } else {
        panel.className = 'results-panel partial';
        titleEl.innerHTML = '<ion-icon name="information-circle"></ion-icon> Logically Equivalent (Not Simplified)';
        badgeEl.textContent = '0% Simplified';
        badgeEl.style.color = '#b45309';
        bodyEl.textContent = `Your expression is equivalent, but has not reduced the complexity (Cost: ${userCost} vs Original: ${origCost}). Try applying Boolean algebra laws to eliminate redundant terms!`;
      }

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-label">Equivalence</div>
          <div class="stat-card-value" style="color:#16a34a;">Yes ✓</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Your Cost</div>
          <div class="stat-card-value">${userCost}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Original Cost</div>
          <div class="stat-card-value">${origCost}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Minimal Cost</div>
          <div class="stat-card-value" style="color:var(--color-primary);">${minCost}</div>
        </div>
      `;

      solutionCard.style.display = 'block';
      solutionExpr.textContent = DigitalLogicEngine.formatAST(this.currentProblem.simplest.ast, this.displayFormat);
    }

    // Scroll results into view smoothly
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Reveal simplest solution on demand
  revealSolution() {
    if (!this.currentProblem) return;
    const panel = document.getElementById('circuitResultsPanel');
    const titleEl = document.getElementById('resultsTitle');
    const badgeEl = document.getElementById('resultsPctBadge');
    const bodyEl = document.getElementById('resultsBody');
    const statsGrid = document.getElementById('resultsStatsGrid');
    const solutionCard = document.getElementById('resultsSolutionCard');
    const solutionExpr = document.getElementById('resultsSolutionExpr');
    const counterBox = document.getElementById('resultsCounterexampleBox');

    if (!panel) return;
    panel.style.display = 'block';
    panel.className = 'results-panel partial';

    titleEl.innerHTML = '<ion-icon name="bulb"></ion-icon> Minimal Solution Revealed';
    badgeEl.textContent = `Optimal Cost: ${this.currentProblem.simplest.cost}`;
    bodyEl.textContent = 'Here is the simplest equivalent equation computed by the built-in minimal solver:';
    counterBox.style.display = 'none';

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Original Cost</div>
        <div class="stat-card-value">${this.currentProblem.origCost}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Minimal Cost</div>
        <div class="stat-card-value" style="color:var(--color-primary);">${this.currentProblem.simplest.cost}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Variables</div>
        <div class="stat-card-value">${this.currentProblem.vars.join(', ')}</div>
      </div>
    `;

    solutionCard.style.display = 'block';
    solutionExpr.textContent = DigitalLogicEngine.formatAST(this.currentProblem.simplest.ast, this.displayFormat);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  hideResults() {
    const panel = document.getElementById('circuitResultsPanel');
    if (panel) panel.style.display = 'none';
  }

  // Toggle interactive truth table view
  toggleTruthTable() {
    const section = document.getElementById('truthTableSection');
    const wrapper = document.getElementById('truthTableWrapper');
    if (!section || !wrapper || !this.currentProblem) return;

    if (section.style.display === 'block') {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const vars = this.currentProblem.vars;
    const origTT = this.currentProblem.truthTable;

    // Read current user expression if present
    const input = document.getElementById('circuitUserInput');
    const userText = input ? input.value.trim() : '';
    let userTT = null;
    if (userText) {
      try {
        const userAST = DigitalLogicEngine.parse(userText);
        userTT = DigitalLogicEngine.getTruthTable(userAST, vars);
      } catch (e) {
        userTT = null;
      }
    }

    // Build truth table HTML
    let tableHtml = `
      <table class="truth-table">
        <thead>
          <tr>
            <th>#</th>
            ${vars.map(v => `<th>${v}</th>`).join('')}
            <th>Original f</th>
            <th>Your Answer</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
    `;

    const limit = Math.min(origTT.length, 64);
    for (let i = 0; i < limit; i++) {
      const origVal = origTT[i];
      const userVal = userTT ? userTT[i] : '--';
      const isMatch = userTT ? (origVal === userVal) : null;
      const mismatchClass = (isMatch === false) ? 'mismatch' : '';

      tableHtml += `
        <tr class="${mismatchClass}">
          <td>${i}</td>
          ${vars.map((_, idx) => `<td>${(i >> (vars.length - 1 - idx)) & 1}</td>`).join('')}
          <td><strong>${origVal}</strong></td>
          <td>${userVal}</td>
          <td>${isMatch === true ? '✓' : isMatch === false ? '✗' : '--'}</td>
        </tr>
      `;
    }

    tableHtml += `</tbody></table>`;
    if (origTT.length > limit) {
      tableHtml += `<p style="font-size:var(--font-size-xs); color:var(--color-text-secondary); padding:var(--space-2);">Displaying first ${limit} of ${origTT.length} states.</p>`;
    }

    wrapper.innerHTML = tableHtml;
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Timer functionality
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  resetTimer() {
    this.timerSeconds = 0;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const el = document.getElementById('circuitTimerVal');
    if (!el) return;
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('circuitLabGame');
  if (container) {
    window.circuitLabInstance = new CircuitLabGame('circuitLabGame');
  }
});
