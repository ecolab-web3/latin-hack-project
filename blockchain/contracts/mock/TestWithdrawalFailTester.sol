// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TestWithdrawalFailTester {
    function executeCreateSeason(address target, string memory name, uint256 price, uint256 cap, uint256 dur) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("createNewSeason(string,uint256,uint256,uint256)", name, price, cap, dur)
        );
        require(success, "Llamada externa a createNewSeason fallo");
    }
    
    function executeWithdraw(address target) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("withdraw()")
        );
        
        // La herramienta de coverage es instruida para ignorar solo el camino 'if' (éxito),
        // ya que este mock está diseñado para probar el camino 'else' (fallo).
        /* istanbul ignore if */
        require(success, "Llamada externa a withdraw fallo");
    }

    receive() external payable {
        revert("Rechazo recibir ETH para probar el fallo");
    }
}