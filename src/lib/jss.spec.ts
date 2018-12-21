// tslint:disable:no-expression-statement
import test from 'ava';
import sinon from 'sinon';
import Jss from './jss';

test('should have empty rules if called wtesth no arguments', t => {
  const jss = new Jss();
  t.deepEqual({ ...jss }, { rules: {} });
  // t(jss.rules).deepEqual({});
});

test('should load rules wtesth the addRule method', t => {
  const jss = new Jss();
  const handler = sinon.spy();
  jss.addRule('name', handler);
  t.deepEqual(jss.rules, { name: handler });
});

test('should load rules by using the rules option', t => {
  const handler = sinon.spy();
  const rules = {
    name: handler
  };
  const jss = new Jss({ rules });
  t.deepEqual(jss.rules, { name: handler });
});

test('should return the data without changes if no rules are specified', t => {
  const data = {
    id: 'testId',
    name: 'testName'
  };
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
  };
  const jss = new Jss();
  const result = jss.clean(schema, data);
  t.deepEqual(result, data);
});

test('should insert the default property if the value is missing', t => {
  const data = {
    name: 'testName'
  };
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
  };
  const jss = new Jss();
  const result = jss.clean(schema, data);
  t.deepEqual(result, {
    id: 'defaultId',
    name: 'testName'
  });
});

test('should handle allOf', t => {
  const data = {
    id: 'testId',
    name: 'testName',
    email: 'test@email.com'
  };
  const jss = new Jss();

  const schema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    'type': 'object',
    'allOf': [
      {
        'properties': {
          'id': {
            'type': 'string'
          },
          'name': {
            'type': 'string'
          }
        }
      },
      {
        'properties': {
          'email': {
            'type': 'string'
          }
        }
      }
    ]
  };

  const result = jss.clean(schema, data);
  t.deepEqual(result, {
    id: 'testId',
    name: 'testName',
    email: 'test@email.com'
  });
});

test('should clean simple array elements', t => {
  const data: ReadonlyArray<string> = [
    'a',
    'b'
  ];
  const schema = {
    'type': 'array',
    'items': {
      'type': 'string'
    }
  };

  const jss = new Jss();
  const result = jss.clean(schema, data);
  t.deepEqual(result, data);
});

test('should handle complex array elements', t => {
  const data = {
    names: [
      {
        firstName: 'fn1',
        lastName: 'ln1'
      },
      {
        firstName: 'fn2',
        lastName: 'ln2'
      }
    ],
    ids: [
      'a',
      'b'
    ]
  };
  const schema = {
    'type': 'object',
    'properties': {
      'names': {
        'type': 'array',
        'items': {
          'type': 'object',
          'properties': {
            'firstName': {
              'type': 'string'
            },
            'lastName': {
              'type': 'string'
            }
          }
        }
      },
      'ids': {
        'type': 'array',
        'items': {
          'type': 'string'
        }
      }
    }
  };

  const jss = new Jss();
  const result = jss.clean(schema, data);
  t.deepEqual(result, data);
});

// it.skip('should throw on unsupported schemas', () => {
// });
// it.skip('should throw on invalid data', () => {
// });

test('should apply rules defined on a leaf node', t => {
  const data = {
    id: 'testId',
    name: 'testName'
  };
  const schema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    'type': 'object',
    'properties': {
      'id': {
        'type': 'string',
        'default': 'defaultId'
      },
      'name': {
        'type': 'string',
        'rules': [
          'trim'
        ]
      }
    },
    'required': [
      'name'
    ]
  };

  const jss = new Jss();
  const handler = sinon.stub().callsFake(() => 'cleanedName');
  jss.addRule('trim', handler);

  const result = jss.clean(schema, data);
  sinon.assert.calledOnce(handler);
  sinon.assert.calledWith(handler, 'testName');

  t.deepEqual(result, {
    id: 'testId',
    name: 'cleanedName'
  });
});

test('should apply multiple rules', t => {
  const data = {
    name: 'testName'
  };

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        rules: [
          'trim',
          'cut'
        ]
      }
    }
  };
  const trimHandler = sinon.stub().callsFake(() => 'trimmedValue');
  const cutHandler = sinon.stub().callsFake(() => 'cutValue');
  const jss = new Jss();
  jss.addRule('trim', trimHandler);
  jss.addRule('cut', cutHandler);

  const result = jss.clean(schema, data);

  sinon.assert.calledOnce(trimHandler);
  sinon.assert.calledOnce(cutHandler);

  sinon.assert.calledWith(trimHandler, 'testName');
  sinon.assert.calledWith(cutHandler, 'trimmedValue');

  t.deepEqual(result, {
    name: 'cutValue'
  });
});

// it.skip('should not apply rules to default values', () => {
// });
test('should not apply rules to missing properties that are not required', t => {
  const data = {};

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        rules: [
          'trim'
        ]
      }
    }
  };
  const jss = new Jss();

  const trimHandler = sinon.stub().callsFake(() => 'trimmedValue');
  jss.addRule('trim', trimHandler);

  const result = jss.clean(schema, data);
  sinon.assert.notCalled(trimHandler);
  t.deepEqual(result, {});
});
// it.skip('should throw if a rule is not defined', () => {
//
// });

test('should pass arguments to the handler if present', t => {
  const data = {
    name: 'testName'
  };

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        rules: [
          ['cut', 'arg1']
        ]
      }
    },
    required: [
      'name'
    ]
  };

  const jss = new Jss();

  const handlerFunc = (): string => {
    return 'cutName';
  };
  const cutHandler = sinon.stub().callsFake(handlerFunc);
  jss.addRule('cut', cutHandler);

  const result = jss.clean(schema, data);

  sinon.assert.calledOnce(cutHandler);
  sinon.assert.calledWith(cutHandler, 'testName', 'arg1');

  t.deepEqual(result, {
    name: 'cutName'
  });
});
