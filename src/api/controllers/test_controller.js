// ❌ BAD CODE ON PURPOSE to trigger checks
function test_controller( ) {
console.log("debug here") // should fail: console.log not allowed
const BAD_variable = "test"; // should fail: wrong naming convention
return BAD_variable
}

module.exports=test_controller
