
let currentQuestion

let questionElem

let questionPromptElem

let multipleChoiceElements
let multipleChoiceStatsAmountElems
let multipleChoiceStatsAnswerElems

let estimateInputElem
let estimateConfirmElem

let openInputElem
let openConfirmElem

let timerElement
let timerNumber

let answeredLastShown = true

let statsTimeout

const statsDelay = 1500

// Publicly visible functions
const mod = {
  processAnswer (answerObj) { return Promise.reject(new Error('No answer processing connected to UI')) },

  //
  // Takes an object with at least a 'question' property, holding a string with
  // the question text and an 'options' property with something as an answer,
  // e.g. an array of four options.
  //
  showQuestion (question) {
    const { type, prompt, options } = question

    document.body.classList.remove('is-join')
    document.body.classList.remove('is-stats-choice')
    document.body.classList.remove('is-stats-estimate')
    document.body.classList.remove('is-stats-open')

    document.body.classList.add('is-play')

    questionElem.classList.remove('is-waiting')
    timerElement.classList.remove('is-correct')
    timerElement.classList.remove('is-wrong')

    showPrompt(type, prompt)
    showOptions(type, options)
    setQuestionClass(type)

    answeredLastShown = false
    currentQuestion = question

    // If showing stats is pending, stop the timeout, the next question is
    // more important
    if(statsTimeout) {
      clearTimeout(statsTimeout)
      statsTimeout = undefined
    }
  },

  showRoomcode (roomcode) {
    document.querySelector('#roomcode-text').textContent = roomcode
  }
}

obtainElements()
wireEvents()

module.exports = mod

function tryAnswer() {
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
      multipleChoiceStatsAnswerElems.forEach(
        (el, idx) => el.classList.add((idx == result.solution) ? 'is-correct' : 'is-wrong')
      )
      multipleChoiceStatsAmountElems.forEach(
        (el, idx) => el.classList.add((idx == result.solution) ? 'is-correct' : 'is-wrong')
      )
      timerElement.classList.add(result.success ? 'is-correct' : 'is-wrong')

      statsTimeout = setTimeout(function() {
        showStatsChoice(result)
      }, statsDelay)
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

      statsTimeout = window.setTimeout(function() {
        showStatsEstimate(result)
      }, statsDelay)
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
    openInputElem.classList.remove('is-pending')
    openConfirmElem.classList.remove('is-pending')

    // FIXME this is always successful
    openInputElem.classList.add(result.success ? 'is-correct' : 'is-wrong')
    openConfirmElem.classList.add(result.success ? 'is-correct' : 'is-wrong')
    timerElement.classList.add(result.success ? 'is-correct' : 'is-wrong')

    statsTimeout = window.setTimeout(function() {
      showStatsOpen(result)
    }, statsDelay)
  })
}

function showStatsChoice (data) {
  document.body.classList.remove('is-play')
  document.body.classList.add('is-stats-choice')

  const amountElems = document.querySelectorAll('.screen-stats-choice-amount')
  const answerElems = document.querySelectorAll('.screen-stats-choice-answer')
  const correctElem = document.querySelector('.screen-stats-choice-correct')
  const wrongElem = document.querySelector('.screen-stats-choice-wrong')

  const amounts = data.distribution
  const answers = [ 'A', 'B', 'C', 'D' ]

  console.log(amounts)
  console.log(amountElems)
  amountElems.forEach((el, idx) => el.textContent = amounts[idx])
  answerElems.forEach((el, idx) => el.textContent = answers[idx])

  if(data.success) {
    correctElem.style.display = 'block'
    wrongElem.style.display = 'none'
  } else {
    correctElem.style.display = 'none'
    wrongElem.style.display = 'block'
  }
}

function showStatsEstimate (data) {
  console.log("Showing estimate stats")
  document.body.classList.remove('is-play')
  document.body.classList.add('is-stats-estimate')
}

function showStatsOpen (data) {
  console.log("Showing open stats")
  document.body.classList.remove('is-play')
  document.body.classList.add('is-stats-open')
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
