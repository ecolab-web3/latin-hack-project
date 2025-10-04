// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CarbonCredits_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Implementación mínima y autosuficiente de ERC-1155 para tokenizar créditos de carbono (RWA).
 * Cada crédito de carbono certificado se convierte en un nuevo tipo de token con una cantidad específica.
 */

contract CarbonCredits_LatinHack {

    // --- Variables de Estado ---

    address public admin;
    mapping(address => bool) public isCertifier;
    mapping(address => bool) public isVerifier;

    struct CarbonCredit {
        string methodology;
        uint256 co2eAmount;
        uint256 timestamp;
        string location;
        bytes32 proofHash;
    }
    mapping(uint256 => CarbonCredit) public creditDetails; 
    uint256 private _nextTokenId;

    // Estructuras de datos ERC-1155
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // --- Eventos ---

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event CertifierRoleGranted(address indexed certifier);
    event CertifierRoleRevoked(address indexed certifier);
    event VerifierRoleGranted(address indexed verifier);
    event VerifierRoleRevoked(address indexed verifier);
    event CreditCertified(uint256 indexed creditId, address indexed creditOwner, string methodology, uint256 amount, string location, bytes32 proofHash);
    event CreditRetired(uint256 indexed creditId, address indexed retiredBy, uint256 amount);

    // --- Modificadores ---

    modifier onlyAdmin() {
        require(msg.sender == admin, "Llamador no es el admin");
        _;
    }

    modifier onlyCertifier() {
        require(isCertifier[msg.sender], "Llamador no es un certificador");
        _;
    }

    // --- Constructor ---

    constructor(address initialAdmin) {
        admin = initialAdmin;
        isCertifier[initialAdmin] = true;
        isVerifier[initialAdmin] = true; // El admin también puede verificar
        emit CertifierRoleGranted(initialAdmin);
        emit VerifierRoleGranted(initialAdmin);
    }

    // --- Gestión de Roles ---

    function grantCertifierRole(address certifier) external onlyAdmin {
        isCertifier[certifier] = true;
        emit CertifierRoleGranted(certifier);
    }

    function revokeCertifierRole(address certifier) external onlyAdmin {
        isCertifier[certifier] = false;
        emit CertifierRoleRevoked(certifier);
    }

    function grantVerifierRole(address verifier) external onlyAdmin {
        isVerifier[verifier] = true;
        emit VerifierRoleGranted(verifier);
    }

    function revokeVerifierRole(address verifier) external onlyAdmin {
        isVerifier[verifier] = false;
        emit VerifierRoleRevoked(verifier);
    }

    // --- Lógica Principal del Negocio ---

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
        _mint(creditOwner, creditId, co2eAmount);
        emit CreditCertified(creditId, creditOwner, methodology, co2eAmount, location, proofHash);
    }

    function retireCredit(uint256 creditId, uint256 amount) external {
        // La quema se realiza desde la dirección del llamador de la función
        burn(msg.sender, creditId, amount);
        emit CreditRetired(creditId, msg.sender, amount);
    }

    // --- Implementación Mínima de ERC-1155 ---

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        return _balances[id][account];
    }

    function setApprovalForAll(address operator, bool approved) public {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: no autorizado para transferir");
        require(to != address(0), "ERC1155: no se puede transferir a la direccion cero");
        require(_balances[id][from] >= amount, "ERC1155: balance insuficiente");
        _balances[id][from] -= amount;
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
    }
    
    function burn(address from, uint256 id, uint256 amount) public {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: no autorizado para quemar");
        require(_balances[id][from] >= amount, "ERC1155: balance insuficiente para quemar");
        _balances[id][from] -= amount;
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }
    
    function _mint(address to, uint256 id, uint256 amount) private {
        require(to != address(0), "ERC1155: no se puede acunar a la direccion cero");
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }
}