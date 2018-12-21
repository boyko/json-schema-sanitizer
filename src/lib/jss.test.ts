import { expect } from 'chai';
import 'mocha';
import sinon from 'sinon';
import Jss from './jss';

describe('json-schema-sanitizer', () => {
  describe('exceptions', () => {
    it('should throw on invalid data', () => {
      const data = {};
      const schema = {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          }
        },
        required: [
          'name'
        ]
      };

      const jss = new Jss();
      expect(() => jss.clean(schema, data)).to.throw('Invalid data.');
    });
    it('should throw if a rule is not found', () => {
      const data = '';
      const schema = {
        type: 'string',
        rules: [
          'tr'
        ]
      };
      const jss = new Jss();
      expect(() => jss.clean(schema, data)).to.throw('Cannot find rule tr.');
    });
    it('should throw if a rule throws an error', () => {
      const schema = {
        type: 'string',
        rules: [
          'fail'
        ]
      };
      const jss = new Jss();
      const fakeRule = sinon.stub().throws('Error running rule');
      jss.addRule('fail', fakeRule);
      expect(() => jss.clean(schema, 'testValue')).to.throw();
    });
    it('should throw if the schemas type is not supported', () => {
      const schema = {
        type: 'specialSchema'
      };
      const jss = new Jss();
      expect(() => jss.clean(schema, 'testString')).to.throw('Unsupported schema.');
    });
  });
  describe('Jss', () => {
    it('should have empty rules if called with no arguments', () => {
      const jss = new Jss();
      expect(jss.rules).to.deep.equal({});
    });
    it('should load rules with the addRule method', () => {
      const jss = new Jss();
      const handler = sinon.spy();
      jss.addRule('name', handler);
      expect(jss).to.have.property('rules').to.deep.equal({
        name: handler
      });
    });
    it('should load rules by using the rules option', () => {
      const handler = sinon.spy();
      const rules = {
        name: handler
      };
      const jss = new Jss({ rules });
      expect(jss).to.have.property('rules').to.deep.equal({
        name: handler
      });
    });
  });
  describe('simpleSchemas', () => {
    it('should return the data without changes if no rules are specified', () => {
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
      expect(result).to.deep.equal(data);
    });
    it('should insert the default property if the value is missing', () => {
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
      expect(result)
        .to
        .deep
        .equal({
          id: 'defaultId',
          name: 'testName'
        });
    });
  });
  describe('allOf schema', () => {
    it('should return the data unchanged if no rules are specified', () => {
      const data = {
        id: 'testId',
        name: 'testName',
        email: 'test@email.com'
      };
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
      const jss = new Jss();
      const result = jss.clean(schema, data);
      expect(result).to.deep.equal(data);
    });
  });
  describe('type === array', () => {
    it('should clean simple array elements', () => {
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
      expect(result).to.deep.equal(data);
    });
    it('should complex array elements', () => {
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
      expect(result).to.deep.equal(data);
    });
  });
  describe('should apply single config (TODO fix) rules', () => {
    it('should apply rules on a leaf node', () => {
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

      expect(result).to.deep.equal({
        id: 'testId',
        name: 'cleanedName'
      });
    });
    it('should apply multiple rules', () => {
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

      expect(result).to.deep.equal({
        name: 'cutValue'
      });
    });
    it('should not apply rules to missing properties that are not required', () => {
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
      expect(result).to.deep.equal({});

      sinon.assert.notCalled(trimHandler);
    });
    it('should pass arguments to the handler if present', () => {
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
      expect(result).to.deep.equal({
        name: 'cutName'
      });

      sinon.assert.calledOnce(cutHandler);
      sinon.assert.calledWith(cutHandler, 'testName', 'arg1');
    });
  });
});
