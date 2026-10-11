/*!
 * Qollab · Platform — generic quiz state machine.
 * Pure scoring logic, independent of presentation. A question set is passed in,
 * so several modules can share the exact same assessment design.
 * Loadable as a classic script (window.createQuiz) or in Node (module.exports).
 */
(function (global) {
  "use strict";

  function createQuiz(QUESTIONS) {
    function createState() {
      return { index: 0, selected: null, confirmed: false, answers: [], done: false };
    }
    function select(state, i) {
      if (state.confirmed || state.done) return state;
      return { index: state.index, selected: i, confirmed: false, answers: state.answers, done: false };
    }
    function confirm(state) {
      if (state.confirmed || state.selected == null || state.done) return state;
      var q = QUESTIONS[state.index];
      var answers = state.answers.concat([{ q: state.index, selected: state.selected, correct: state.selected === q.correct }]);
      return { index: state.index, selected: state.selected, confirmed: true, answers: answers, done: false };
    }
    function next(state) {
      if (!state.confirmed) return state;
      var n = state.index + 1;
      if (n >= QUESTIONS.length) return { index: state.index, selected: state.selected, confirmed: true, answers: state.answers, done: true };
      return { index: n, selected: null, confirmed: false, answers: state.answers, done: false };
    }
    function score(state) { return state.answers.filter(function (a) { return a.correct; }).length; }
    function restart() { return createState(); }
    function total() { return QUESTIONS.length; }
    function message(scoreValue) {
      var ratio = QUESTIONS.length ? scoreValue / QUESTIONS.length : 0;
      if (ratio >= 0.9) return "Excellent understanding.";
      if (ratio >= 0.7) return "Strong understanding.";
      if (ratio >= 0.5) return "Good progress. Review a few concepts.";
      return "Revisit the experiments and try again.";
    }

    return {
      QUESTIONS: QUESTIONS, createState: createState, select: select, confirm: confirm,
      next: next, score: score, restart: restart, total: total, message: message,
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = createQuiz;
  else global.createQuiz = createQuiz;
})(typeof window !== "undefined" ? window : globalThis);
