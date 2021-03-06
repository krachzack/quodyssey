
const Chartist = require('chartist')
const editDistance = require('../source/editDistance')
const maxEditDistance = 2

let currentQuestion

let questionElem

let questionPromptElem

let multipleChoiceElements
let multipleChoiceStatsAmountElems
let multipleChoiceStatsAnswerElems

let estimateInputElem
let estimateConfirmElem
let estimateAvgElem
let estimateMinElem
let estimateMaxElem

let openInputElem
let openConfirmElem
let openAnswerList

let timerElement
let timerNumber

let bodyState

let answeredLastShown = true

const statsDelay = 1500

const scoreboardChartSel = '#screen-scoreboard-chart'

// Publicly visible functions
const mod = {
  processAnswer (answerObj) { return Promise.reject(new Error('No answer processing connected to UI')) },

  showWaitingForNextRound () {
    setBodyState('is-play')
    questionElem.classList.add('is-waiting')
  },

  //
  // Takes an object with at least a 'question' property, holding a string with
  // the question text and an 'options' property with something as an answer,
  // e.g. an array of four options.
  //
  showQuestion (question) {
    const { type, prompt, options } = question

    setBodyState('is-play')

    questionElem.classList.remove('is-waiting')
    timerElement.classList.remove('is-correct')
    timerElement.classList.remove('is-wrong')

    showPrompt(type, prompt)
    showOptions(type, options)
    setQuestionClass(type)

    answeredLastShown = false
    currentQuestion = question
  },

  //
  // Shows statistics for the last shown question
  //
  showStats (question, answer, results) {
    switch(question.type) {
      case "choice":
        showStatsChoice(question, answer, results)
        break

      case "estimate":
        showStatsEstimate(question, answer, results)
        break

      case "open":
        showStatsOpen(question, answer, results)
        break

      default:
        throw new Error(`Cannot show stats for type ${question.type}`)
    }
  },

  showRoomcode (roomcode) {
    document.querySelector('#roomcode-text').textContent = roomcode
  },

  showScoreboard(scores) {
    setBodyState('is-scoreboard')

    const scoreAmplifier = 1

    const names = Object.keys(scores)
    const points = names.map(n => scoreAmplifier*scores[n])
    const data = {
      labels: names,
      series: points,
    }
    const opts = {
      axisY: {
        onlyInteger: true,
      },
      low: 0,
      distributeSeries: true,
    }

    new Chartist.Bar(
      scoreboardChartSel,
      data,
      opts
    )
  },

  isScoreboard() { return bodyState === 'is-scoreboard' },
}

obtainElements()
wireEvents()

module.exports = mod

function setBodyState (stateClassName)  {
  bodyState = stateClassName
  document.body.classList.remove('is-join')
  document.body.classList.remove('is-play')
  document.body.classList.remove('is-stats-choice')
  document.body.classList.remove('is-stats-estimate')
  document.body.classList.remove('is-stats-open')
  document.body.classList.remove('is-scoreboard')
  document.body.classList.add(stateClassName)
}

function tryAnswer () {
  if(answeredLastShown) { return false }
  answeredLastShown = true
  return true
}

function processMultipleChoiceAnswer (idx) {
  if(tryAnswer()) {
    const pickedElement = multipleChoiceElements[idx]
    const nonPickedElements = multipleChoiceElements.filter((el, elIdx) => elIdx != idx)
    const pickedElementClasses = pickedElement.classList

    pickedElementClasses.add('is-pending')
    pickedElementClasses.add('is-picked')
    nonPickedElements.forEach(el => el.classList.add('is-non-picked'))

    mod.processAnswer({
      type: "choice",
      idx
    }).then(function (result) {
      pickedElementClasses.remove('is-pending')
      multipleChoiceElements.forEach(
        (el, idx) => el.classList.add((idx == result.solution) ? 'is-correct' : 'is-wrong')
      )
      timerElement.classList.add(result.success ? 'is-correct' : 'is-wrong')
    })

  }
}

function processEstimateAnswer (estimateVal) {
  if(tryAnswer()) {

    estimateInputElem.classList.add('is-pending')
    estimateConfirmElem.classList.add('is-pending')

    mod.processAnswer({
      type: "estimate",
      estimate: estimateVal
    }).then(function (result) {
      document.querySelector('.question-answer-estimate-btn-text-solution-text').textContent = result.solution
      estimateInputElem.classList.remove('is-pending')
      estimateConfirmElem.classList.remove('is-pending')
      estimateInputElem.classList.add(result.success ? 'is-correct' : 'is-wrong')
      estimateConfirmElem.classList.add(result.success ? 'is-correct' : 'is-wrong')
      timerElement.classList.add(result.success ? 'is-correct' : 'is-wrong')
    })

  }
}

function processOpenAnswer (answer) {
  openInputElem.classList.add('is-pending')
  openConfirmElem.classList.add('is-pending')

  mod.processAnswer({
    type: "open",
    answer
  }).then(function (result) {
    document.querySelector('.question-answer-open-btn-text-solution-text').textContent = result.answer

    openInputElem.classList.remove('is-pending')
    openConfirmElem.classList.remove('is-pending')

    openInputElem.classList.add(result.goodEnough ? 'is-correct' : 'is-wrong')
    openConfirmElem.classList.add(result.goodEnough ? 'is-correct' : 'is-wrong')
    timerElement.classList.add(result.goodEnough ? 'is-correct' : 'is-wrong')
  })
}

function showStatsChoice (question, answer, result) {
  const solutionIdx = ['a', 'b', 'c', 'd'].indexOf(result.answer)

  const amounts = [
    result.result.a,
    result.result.b,
    result.result.c,
    result.result.d
  ]
  const answers = question.options

  setBodyState('is-stats-choice')

  multipleChoiceStatsAnswerElems.forEach(
    (el, idx) => {
      el.textContent = answers[idx]
      el.classList.remove((idx != solutionIdx) ? 'is-correct' : 'is-wrong')
      el.classList.add((idx == solutionIdx) ? 'is-correct' : 'is-wrong')
    }
  )
  multipleChoiceStatsAmountElems.forEach(
    (el, idx) => {
      el.textContent = amounts[idx]
      el.classList.remove((idx != solutionIdx) ? 'is-correct' : 'is-wrong')
      el.classList.add((idx == solutionIdx) ? 'is-correct' : 'is-wrong')
    }
  )

  const correctElem = document.querySelector('.screen-stats-choice-correct')
  const wrongElem = document.querySelector('.screen-stats-choice-wrong')

  if(answer && answer.idx == solutionIdx) {
    correctElem.style.display = 'block'
    wrongElem.style.display = 'none'
  } else {
    correctElem.style.display = 'none'
    wrongElem.style.display = 'block'
  }

  const data = {
    labels: answers,
    series: amounts,
  }
  const opts = {
    axisY: {
      onlyInteger: true,
    },
    low: 0,
    distributeSeries: true,
  }
  new Chartist.Bar(
    '#screen-stats-choice-chart',
    data,
    opts
  )
}

function showStatsEstimate (question, answer, result) {
  const { max, min, avg, participants } = result.result
  const correctCount = result.result.correct

  setBodyState('is-stats-estimate')

  estimateAvgElem.textContent = (avg === undefined) ? 'n/a' : avg
  estimateMaxElem.textContent = (max === undefined) ? 'n/a' : max
  estimateMinElem.textContent = (min === undefined) ? 'n/a' : min

  const estimateVal = answer ? answer.estimate : Number.MAX_VALUE
  const exactVal = result.answer
  // If less than 10% off, show as correct
  const goodEnough = Math.abs(exactVal - estimateVal) < (exactVal * 0.1)
  const okEl = document.querySelector('.screen-stats-estimate-correct')
  const wrongEl = document.querySelector('.screen-stats-estimate-wrong')

  okEl.style.display = (goodEnough) ? 'block' : 'none'
  wrongEl.style.display = (!goodEnough) ? 'block' : 'none'
}

function showStatsOpen (question, answer, result) {
  const correctAnswer = result.answer
  const givenAnswer = (answer) ? answer.answer : ''

  const { distribution } = result.result
  const answers = distribution ? Object.keys(distribution).map(
    answer => {
      return {
        answer: answer,
        count: distribution[answer],
        correct: editDistance(correctAnswer, answer, maxEditDistance)
      }
    }
  ).sort((a,b) => b.count - a.count) : []

  setBodyState('is-stats-open')

  openAnswerList.innerHTML = answers ? answers.map(
    a => `<dt class="defs-key ${a.correct ? 'is-correct' : 'is-wrong'}">${a.count}</dt>
          <dd class="defs-val ${a.correct ? 'is-correct' : 'is-wrong'}">${a.answer}</dd>`
  ).join('') : ''

  const data = {
    labels: answers.map(a => a.answer),
    series: answers.map(a => a.count),
  }
  const opts = {
    axisY: {
      onlyInteger: true,
    },
    low: 0,
    distributeSeries: true,
  }

  new Chartist.Bar(
    '#screen-stats-open-chart',
    data,
    opts
  )

  const goodEnough = givenAnswer ? editDistance(correctAnswer, givenAnswer, maxEditDistance) : false

  const okEl = document.querySelector('.screen-stats-open-correct')
  const wrongEl = document.querySelector('.screen-stats-open-wrong')
  okEl.style.display = (goodEnough) ? 'block' : 'none'
  wrongEl.style.display = (!goodEnough) ? 'block' : 'none'
}

function showPrompt (type, prompt) {
  switch(type) {
    case "choice":
    case "estimate":
    case "open":
      questionPromptElem.innerText = prompt
      break

    default:
      throw new Error(`Dunno how to show prompt for type: ${type}`)
  }
}

function showOptions (type, options) {
  switch(type) {
    case "choice":
      showMultipleChoiceOptions(options)
      break

    case "estimate":
      showEstimateInput()
      break

    case "open":
      showOpenInput()
      break

    default:
      throw new Error(`Dunno how to show options for type: ${type}`)
  }
}

function showMultipleChoiceOptions (options) {
  multipleChoiceElements.forEach((elem, idx) => {
    elem.classList.remove('is-correct')
    elem.classList.remove('is-wrong')
    elem.classList.remove('is-picked')
    elem.classList.remove('is-non-picked')

    const optionText = options[idx]
    elem.innerText =  optionText
  })

  multipleChoiceStatsAnswerElems.forEach((elem, idx) => {
    elem.classList.remove('is-correct')
    elem.classList.remove('is-wrong')
    elem.classList.remove('is-picked')
    elem.classList.remove('is-non-picked')

    const optionText = options[idx]
    elem.innerText =  optionText
  })
}

function showEstimateInput() {
  estimateInputElem.value = 0
  estimateInputElem.classList.remove('is-correct')
  estimateInputElem.classList.remove('is-wrong')

  estimateConfirmElem.classList.remove('is-correct')
  estimateConfirmElem.classList.remove('is-wrong')
}

function showOpenInput() {
  openInputElem.value = ''
  openInputElem.classList.remove('is-correct')
  openInputElem.classList.remove('is-wrong')
  openConfirmElem.classList.remove('is-correct')
  openConfirmElem.classList.remove('is-wrong')
}

function setQuestionClass (type) {
  questionElem.classList.remove('is-choice')
  questionElem.classList.remove('is-estimate')
  questionElem.classList.remove('is-open')

  questionElem.classList.add(`is-${type}`)
}

function updateTimebar () {
  if(currentQuestion) {
    const nowMs = new Date().getTime()
    const alpha = (nowMs - currentQuestion.start.getTime()) /
                  (currentQuestion.end.getTime() - currentQuestion.start.getTime())

    if(alpha > 0.0 && alpha < 1.0) {
        const remainingSecs = Math.ceil((currentQuestion.end.getTime() - nowMs) / 1000)
        timerNumber.textContent = remainingSecs

        const timerWidth = (100 * (1-alpha)) + "%"
        timerNumber.style.width = timerWidth

        if(alpha > 0.75) {
          timerElement.classList.remove('is-critical-2')
          timerElement.classList.add('is-critical-1')
        } else if(alpha > 0.5) {
          timerElement.classList.add('is-critical-2')
        } else {
          timerElement.classList.remove('is-critical-1')
          timerElement.classList.remove('is-critical-2')
        }
    }
  }
}

//
// Finds interface elements in the document and stores them in module variables
//
function obtainElements () {
  const questionSel = '#question'
  const questionPromptSel = '#question-prompt-text'
  const multipleChoiceSels = [
    '#question-answer-a',
    '#question-answer-b',
    '#question-answer-c',
    '#question-answer-d',
  ]
  const estimateInputSel = '#question-answer-estimate'
  const estimateConfirmSel = '#question-answer-estimate-confirm'

  questionElem = document.querySelector(questionSel)

  questionPromptElem = document.querySelector(questionPromptSel)
  multipleChoiceElements = multipleChoiceSels.map(sel => document.querySelector(sel))
  multipleChoiceStatsAnswerElems = document.querySelectorAll('.screen-stats-choice-answer')
  multipleChoiceStatsAmountElems = document.querySelectorAll('.screen-stats-choice-amount')

  estimateInputElem = document.querySelector(estimateInputSel)
  estimateConfirmElem = document.querySelector(estimateConfirmSel)

  openInputElem = document.querySelector("#question-answer-open")
  openConfirmElem = document.querySelector("#question-answer-open-confirm")

  timerElement = document.querySelector("#timer")
  timerNumber = document.querySelector("#timer_number")

  estimateAvgElem = document.querySelector('.screen-stats-estimate-avg')
  estimateMinElem = document.querySelector('.screen-stats-estimate-min')
  estimateMaxElem = document.querySelector('.screen-stats-estimate-max')

  openAnswerList = document.querySelector('#screen-stats-open-answers')
}

function wireEvents () {
  multipleChoiceElements.forEach(
    (el, idx) => el.addEventListener(
      'click',
      () => processMultipleChoiceAnswer(idx)
    )
  )

  estimateConfirmElem.addEventListener(
    'click',
    () => processEstimateAnswer(Number.parseFloat(estimateInputElem.value))
  )

  openConfirmElem.addEventListener(
    'click',
    () => processOpenAnswer(openInputElem.value)
  )

  setInterval(updateTimebar, 16)
}
