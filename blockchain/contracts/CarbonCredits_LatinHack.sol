// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/access/Ownable.sol";
import {ICarbonCredits_LatinHack} from "./interfaces/ICarbonCredits_LatinHack.sol";
import {ERC1155Burnable} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {AccessControlEnumerable} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/access/extensions/AccessControlEnumerable.sol";
import {IERC165} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/utils/introspection/IERC165.sol";
import {ERC165} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/utils/introspection/ERC165.sol";

/**
 * @title CarbonCredits_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Implementación mínima y autosuficiente de ERC-1155 para tokenizar créditos de carbono (RWA).
 * Cada crédito de carbono certificado se convierte en un nuevo tipo de token con una cantidad específica.
 */
contract CarbonCredits_LatinHack is ICarbonCredits_LatinHack, ERC1155, ERC1155Burnable, AccessControlEnumerable {
    
    // --- Variables de Estado ---

    // Roles de control de acceso
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Datos específicos del negocio: cada 'id' de token mapea a los detalles de un crédito único
    mapping(uint256 => CarbonCredit) public creditDetails; 
    uint256 private _nextTokenId;

    // --- Modificadores ---

    modifier onlyCertifier() {
        _checkRole(CERTIFIER_ROLE);
        _;
    }

    modifier onlyVerifier() {
        _checkRole(VERIFIER_ROLE);
        _;
    }

    // --- Constructor ---

    /**
     * @notice Constructor del contrato CarbonCredits_LatinHack.
     * @param initialAdmin La dirección del administrador inicial que tendrá todos los roles.
     */
    constructor(address initialAdmin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(CERTIFIER_ROLE, initialAdmin);
        emit CertifierRoleGranted(initialAdmin);
    }

    // --- Funciones de Soporte de Interfaces ---

    /**
     * @notice Verifica si el contrato soporta una interfaz específica.
     * @param interfaceId El ID de la interfaz a verificar.
     * @return Verdadero si el contrato soporta la interfaz, falso en caso contrario.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, IERC165, ERC1155) returns (bool) {
        return type(ICarbonCredits_LatinHack).interfaceId == interfaceId || super.supportsInterface(interfaceId);
    }

    // --- Gestión de Roles ---

    /// @inheritdoc ICarbonCredits_LatinHack
    function grantCertifierRole(address certifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(CERTIFIER_ROLE, certifier);
        emit CertifierRoleGranted(certifier);
    }

    /// @inheritdoc ICarbonCredits_LatinHack
    function revokeCertifierRole(address certifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(CERTIFIER_ROLE, certifier);
        emit CertifierRoleRevoked(certifier);
    }

    /// @inheritdoc ICarbonCredits_LatinHack
    function grantVerifierRole(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
        emit VerifierRoleGranted(verifier);
    }

    /// @inheritdoc ICarbonCredits_LatinHack
    function revokeVerifierRole(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
        emit VerifierRoleRevoked(verifier);
    }

    // --- Lógica Principal del Negocio ---

    /// @inheritdoc ICarbonCredits_LatinHack
    function certifyAndMintCarbonCredit(
        address creditOwner,
        string memory methodology,
        uint256 co2eAmount,
        string memory location,
        bytes32 proofHash
    ) external onlyCertifier {
        uint256 creditId = _nextTokenId++;
        creditDetails[creditId] = CarbonCredit({
            methodology: methodology,
            co2eAmount: co2eAmount,
            timestamp: block.timestamp,
            location: location,
            proofHash: proofHash
        });
        _mint(creditOwner, creditId, co2eAmount, "");
        emit CreditCertified(creditId, creditOwner, methodology, co2eAmount, location, proofHash);
    }

    /// @inheritdoc ICarbonCredits_LatinHack
    function retireCredit(uint256 creditId, uint256 amount) external {
        burn(msg.sender, creditId, amount);
        emit CreditRetired(creditId, msg.sender, amount);
    }
}