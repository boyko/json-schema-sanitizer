// tslint:disable:no-expression-statement
import test from 'ava'
import sinon from 'sinon'
import Jss from './jss'

test('should have empty rules if called wtesth no arguments', t => {
  const jss = new Jss()
  t.deepEqual({ ...jss }, { rules: {} })
  // t(jss.rules).deepEqual({});
})

test('should load rules wtesth the addRule method', t => {
  const jss = new Jss()
  const handler = sinon.spy()
  jss.addRule('name', handler)
  t.deepEqual(jss.rules, { name: handler })
})

test('should load rules by using the rules option', t => {
  const handler = sinon.spy()
  const rules = {
    name: handler
  }
  const jss = new Jss({ rules })
  t.deepEqual(jss.rules, { name: handler })
})

test('should return the data without changes if no rules are specified', t => {
  const data = {
    id: 'testId',
    name: 'testName'
  }
  const schema = {
    'type': 'object',
    'properties': {
      'id': {
        'default': 'defaultId',
        'type': 'string'
      },
      'name': {
        'type': 'string'
      }
    },
    'required': [
      'name'
    ]
  }
  const jss = new Jss()
  const result = jss.clean(schema, data)
  t.deepEqual(result, data)
})

test('should insert the default property if the value is missing', t => {
  const data = {
    name: 'testName'
  }
  const schema = {
    'type': 'object',
    'properties': {
      'id': {
        'type': 'string',
        'default': 'defaultId'
      },
      'name': {
        'type': 'string'
      }
    },
    'required': [
      'name'
    ]
  }
  const jss = new Jss()
  const result = jss.clean(schema, data)
  t.deepEqual(result, {
    id: 'defaultId',
    name: 'testName'
  })
})
