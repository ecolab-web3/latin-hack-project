// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RecyclingCredits_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Implementación mínima y autosuficiente de ERC-1155 para tokenizar créditos de reciclaje (RWA).
 * Cada lote de reciclaje certificado se convierte en un nuevo tipo de token con una cantidad específica.
 */
contract RecyclingCredits_LatinHack {

    // --- Variables de Estado ---

    // Lógica de propiedad y control de acceso
    address public owner;
    mapping(address => bool) public isCertifier;

    // Estructuras de datos principales de ERC-1155
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Datos específicos del negocio: cada 'id' de token mapea a los detalles de un lote único
    struct CreditData {
        string materialType;
        uint256 totalWeightKg; // Peso total original del lote certificado
        uint256 timestamp;
        string location;
        bytes32 proofHash;
    }
    mapping(uint256 => CreditData) public creditDetails;
    uint256 private _nextTokenId;

    // --- Eventos ---

    // Eventos estándar de ERC-1155
    event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _amount);
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);

    // Eventos personalizados del negocio
    event CreditBatchCertified(uint256 indexed creditId, address indexed initialOwner, string materialType, uint256 weightKg, bytes32 proofHash);
    event CreditsRetired(uint256 indexed creditId, address indexed retiredBy, uint256 amount);
    event CertifierRoleGranted(address indexed certifier);
    event CertifierRoleRevoked(address indexed certifier);

    // --- Modificadores ---

    modifier onlyOwner() {
        require(owner == msg.sender, "Caller is not the owner");
        _;
    }

    modifier onlyCertifier() {
        require(isCertifier[msg.sender], "Caller is not a certifier");
        _;
    }

    // --- Constructor ---

    constructor(address initialAdmin) {
        owner = initialAdmin;
        isCertifier[initialAdmin] = true;
        emit CertifierRoleGranted(initialAdmin);
    }

    // --- Gestión de Roles ---

    function grantCertifierRole(address certifier) external onlyOwner {
        isCertifier[certifier] = true;
        emit CertifierRoleGranted(certifier);
    }

    function revokeCertifierRole(address certifier) external onlyOwner {
        isCertifier[certifier] = false;
        emit CertifierRoleRevoked(certifier);
    }

    // --- Lógica Principal del Negocio ---

    /**
     * @notice (Certificador) Crea un nuevo tipo de token para un lote de reciclaje y acuña su cantidad total.
     */
    function certifyAndMintBatch(
        address creditOwner,
        string memory materialType,
        uint256 weightKg,
        string memory location,
        bytes32 proofHash
    ) external onlyCertifier {
        uint256 creditId = _nextTokenId++;
        
        creditDetails[creditId] = CreditData({
            materialType: materialType,
            totalWeightKg: weightKg,
            timestamp: block.timestamp,
            location: location,
            proofHash: proofHash
        });

        // Acuña la cantidad total de créditos para este nuevo lote/tipo
        _mint(creditOwner, creditId, weightKg);

        emit CreditBatchCertified(creditId, creditOwner, materialType, weightKg, proofHash);
    }

    /**
     * @notice (Dueño del token) Retira (quema) una cantidad de créditos para certificar su uso.
     */
    function retireCredits(uint256 creditId, uint256 amount) external {
        // La quema se realiza desde la dirección del llamador de la función
        burn(msg.sender, creditId, amount);
        emit CreditsRetired(creditId, msg.sender, amount);
    }

    // --- Implementación Mínima de ERC-1155 ---

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "ERC1155: direccion invalida");
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
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: no autorizado");
        require(to != address(0), "ERC1155: no se puede transferir a la direccion cero");
        require(_balances[id][from] >= amount, "ERC1155: balance insuficiente");

        _balances[id][from] -= amount;
        _balances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }
    
    function burn(address from, uint256 id, uint256 amount) public {
        require(from == msg.sender, "ERC1155: solo el propietario puede quemar sus tokens");
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