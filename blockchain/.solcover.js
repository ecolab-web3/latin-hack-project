// Se ignoran el contrato de mock 'TestWithdrawalFailTester.sol' en el reporte de cobertura.
// El propósito principal de 'TestWithdrawalFailTester.sol' es validar un único escenario de fallo:
// la reversión de la función 'withdraw' cuando el propietario es un contrato que rechaza Ether.
// Este escenario ya está cubierto con éxito en nuestros tests.
//
// Alcanzar el 100% de cobertura en el propio mock requiere tests adicionales que han demostrado ser frágiles
// y conflictivos con la instrumentación de la herramienta 'solidity-coverage'.
//
// Por lo tanto, para mantener el reporte de cobertura limpio y enfocado en los contratos de producción,
// se omite intencionalmente este archivo auxiliar del análisis.
module.exports = {
  skipFiles: ['mock/TestWithdrawalFailTester.sol']
};