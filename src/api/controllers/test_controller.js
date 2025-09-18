import TEST_VARIABLES from '../../core/constants/appConstants.js';
import logger from '../../config/logger.js';

function testController() {
  logger.info(TEST_VARIABLES.TEST_STATEMENT); // console allowed in logger only
  const testVariable = TEST_VARIABLES.TEST_VARIABLE; // use constant instead of hardcoded string
  return testVariable;
}

export default testController;
