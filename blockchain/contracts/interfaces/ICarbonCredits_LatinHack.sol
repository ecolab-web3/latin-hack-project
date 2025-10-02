// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC1155} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/token/ERC1155/IERC1155.sol";
import {IAccessControlEnumerable} from "@papermoonio/openzeppelin-contracts-polkadot/contracts/access/extensions/IAccessControlEnumerable.sol";

/**
 * @title ICarbonCredits_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Interfaz para el contrato CarbonCredits_LatinHack.
 * Define las funciones y eventos para la gestión de créditos de carbono tokenizados (RWA).
 * Cada crédito de carbono certificado se convierte en un nuevo tipo de token con una cantidad específica.
 */
interface ICarbonCredits_LatinHack is IAccessControlEnumerable, IERC1155 {
    
    // --- Estructura de Datos ---
    
    /**
     * @notice Estructura que contiene los datos específicos de un crédito de carbono.
     * @dev Cada 'id' de token mapea a los detalles de un crédito único.
     */
    struct CarbonCredit {
        string methodology;          // e.g., REDD+, Solar, Wind, Cookstoves
        uint256 co2eAmount;         // Toneladas de CO2e para este crédito específico
        uint256 timestamp;          // Timestamp de certificación del crédito
        string location;            // Ubicación geográfica del crédito
        bytes32 proofHash;          // Hash IPFS para la documentación de este crédito específico
    }

    // --- Eventos ---

    // Eventos personalizados del negocio
    event CreditCertified(uint256 creditId, address creditOwner, string methodology, uint256 co2eAmount, string location, bytes32 proofHash);
    event CreditRetired(uint256 creditId, address retiredBy, uint256 amount);
    event CertifierRoleGranted(address indexed certifier);
    event CertifierRoleRevoked(address indexed certifier);
    event VerifierRoleGranted(address indexed verifier);
    event VerifierRoleRevoked(address indexed verifier);

    // --- Funciones de Gestión de Roles ---

    /**
     * @notice Otorga el rol de certificador a una dirección.
     * @param certifier La dirección a la que se le otorgará el rol de certificador.
     */
    function grantCertifierRole(address certifier) external;

    /**
     * @notice Revoca el rol de certificador de una dirección.
     * @param certifier La dirección de la cual se revocará el rol de certificador.
     */
    function revokeCertifierRole(address certifier) external;

    /**
     * @notice Otorga el rol de verificador a una dirección.
     * @param verifier La dirección a la que se le otorgará el rol de verificador.
     */
    function grantVerifierRole(address verifier) external;

    /**
     * @notice Revoca el rol de verificador de una dirección.
     * @param verifier La dirección de la cual se revocará el rol de verificador.
     */
    function revokeVerifierRole(address verifier) external;

    // --- Lógica Principal del Negocio ---

    /**
     * @notice (Certificador) Crea un nuevo tipo de token para un crédito de carbono y acuña su cantidad total.
     * @param creditOwner La dirección que recibirá los créditos acuñados.
     * @param methodology Metodología utilizada para este crédito (e.g., REDD+, Solar, Wind).
     * @param co2eAmount Cantidad de CO2e para este crédito específico (en toneladas).
     * @param location Ubicación geográfica del crédito.
     * @param proofHash Hash de los documentos de certificación (e.g., IPFS CID).
     */
    function certifyAndMintCarbonCredit(
        address creditOwner,
        string memory methodology,
        uint256 co2eAmount,
        string memory location,
        bytes32 proofHash
    ) external;

    /**
     * @notice (Dueño del token) Retira (quema) una cantidad de créditos para certificar su uso.
     * @param creditId El ID del token de crédito de carbono a retirar.
     * @param amount La cantidad de créditos a retirar.
     */
    function retireCredit(uint256 creditId, uint256 amount) external;
}
