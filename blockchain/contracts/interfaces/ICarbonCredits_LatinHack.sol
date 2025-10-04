// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ICarbonCredits_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Interfaz refactorizada y autosuficiente para el contrato CarbonCredits_LatinHack.
 * Se eliminaron las dependencias externas y se incluyeron las funciones estándar de ERC-1155
 * que el contrato principal ahora implementa directamente.
 */
interface ICarbonCredits_LatinHack {
    
    // --- Eventos ---

    // Eventos estándar de ERC-1155
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Eventos personalizados del negocio
    event CreditCertified(uint256 indexed creditId, address indexed creditOwner, string methodology, uint256 amount, string location, bytes32 proofHash);
    event CreditRetired(uint256 indexed creditId, address indexed retiredBy, uint256 amount);
    event CertifierRoleGranted(address indexed certifier);
    event CertifierRoleRevoked(address indexed certifier);
    event VerifierRoleGranted(address indexed verifier);
    event VerifierRoleRevoked(address indexed verifier);

    // --- Funciones de Gestión de Roles ---

    function grantCertifierRole(address certifier) external;
    function revokeCertifierRole(address certifier) external;
    function grantVerifierRole(address verifier) external;
    function revokeVerifierRole(address verifier) external;

    // --- Lógica Principal del Negocio ---

    function certifyAndMintCarbonCredit(
        address creditOwner,
        string memory methodology,
        uint256 co2eAmount,
        string memory location,
        bytes32 proofHash
    ) external;

    function retireCredit(uint256 creditId, uint256 amount) external;

    // --- Funciones Estándar de ERC-1155 ---
    
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;
    function burn(address from, uint256 id, uint256 amount) external;
}