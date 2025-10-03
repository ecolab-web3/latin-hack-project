// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title BiodiversityCredits_LatinHack_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Contrato diseñado para soportar múltiples proyectos, cada uno con su propio verificador.
 * Esta arquitectura permite alinear la experiencia del verificador (ej. biólogo marino, experto forestal)
 * con la naturaleza específica de cada proyecto de biodiversidad.
 */
contract BiodiversityCredits_LatinHack_LatinHack {

    // --- Variables de Estado ---

    address public admin;

    enum Status { Pending, Approved, Rejected }

    struct Project {
        address developer;
        address verifier; // El verificador específico para este proyecto
        string projectURI;
        bytes32 methodologyHash;
        Status status;
    }

    struct CreditBatch {
        uint256 projectId; // Vínculo al proyecto que originó este lote de créditos
        uint256 timestamp;
        uint256 totalMinted;
    }

    mapping(uint256 => Project) public projects;
    uint256 private _nextProjectId;

    mapping(uint256 => CreditBatch) public creditBatchDetails;
    uint256 private _nextCreditId;

    // Estructuras de datos ERC-1155
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // --- Eventos ---

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ProjectRegistered(uint256 indexed projectId, address indexed developer, address indexed verifier);
    event ProjectStatusUpdated(uint256 indexed projectId, Status newStatus);
    event CreditBatchCertified(uint256 indexed creditId, uint256 indexed projectId, address indexed verifier, address creditOwner, uint256 amount);
    event CreditsRetired(uint256 indexed creditId, address indexed retiredBy, uint256 amount);

    // --- Modificadores ---

    modifier onlyAdmin() {
        require(msg.sender == admin, "Llamador no es el admin");
        _;
    }

    // --- Constructor ---

    /**
     * @dev El constructor establece los roles iniciales de administración y verificación.
     * @param _initialAdmin La dirección que gestionará el contrato.
     */

    constructor(address _initialAdmin) {
        admin = _initialAdmin;
    }

    // --- Gestión de Proyectos ---

    /**
     * @notice INDICACIÓN CRÍTICA DE DISEÑO:
     * Para mitigar la centralización y el riesgo de un único punto de fallo, la dirección
     * '_verifier' DEBERÍA ser una cartera multi-firma (multisig) nativa de Polkadot (Substrate).
     * Esto asegura que la acuñación de nuevos créditos requiera el consenso de múltiples partes
     * independientes, aumentando la confianza y la robustez del sistema.
     */

    function registerProject(address _verifier, string memory _projectURI, bytes32 _methodologyHash) external returns (uint256) {
        require(_verifier != address(0), "El verificador no puede ser la direccion cero");
        uint256 projectId = _nextProjectId++;
        projects[projectId] = Project({
            developer: msg.sender,
            verifier: _verifier,
            projectURI: _projectURI,
            methodologyHash: _methodologyHash,
            status: Status.Pending
        });
        emit ProjectRegistered(projectId, msg.sender, _verifier);
        return projectId;
    }

    function updateProjectStatus(uint256 _projectId, Status _newStatus) external onlyAdmin {
        require(projects[_projectId].developer != address(0), "El proyecto no existe");
        projects[_projectId].status = _newStatus;
        emit ProjectStatusUpdated(_projectId, _newStatus);
    }

    // --- Lógica Principal del Negocio ---

    function certifyAndMintBatch(uint256 _projectId, address _creditOwner, uint256 _amount) external {
        Project storage project = projects[_projectId];
        require(project.status == Status.Approved, "El proyecto no esta aprobado");
        require(msg.sender == project.verifier, "Llamador no es el verificador de este proyecto");

        uint256 creditId = _nextCreditId++;
        creditBatchDetails[creditId] = CreditBatch({
            projectId: _projectId,
            timestamp: block.timestamp,
            totalMinted: _amount
        });

        _mint(_creditOwner, creditId, _amount);
        emit CreditBatchCertified(creditId, _projectId, msg.sender, _creditOwner, _amount);
    }

    function retireCredits(uint256 _creditId, uint256 _amount) external {
        burn(msg.sender, _creditId, _amount);
        emit CreditsRetired(_creditId, msg.sender, _amount);
    }

    // --- Implementación Mínima de ERC-1155 ---

    function balanceOf(address _account, uint256 _id) public view returns (uint256) {
        return _balances[_id][_account];
    }

    function setApprovalForAll(address _operator, bool _approved) public {
        _operatorApprovals[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    function isApprovedForAll(address _account, address _operator) public view returns (bool) {
        return _operatorApprovals[_account][_operator];
    }

    function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _amount, bytes memory _data) public {
        require(_from == msg.sender || isApprovedForAll(_from, msg.sender), "ERC1155: no autorizado para transferir");
        require(_to != address(0), "ERC1155: no se puede transferir a la direccion cero");
        require(_balances[_id][_from] >= _amount, "ERC1155: balance insuficiente");
        _balances[_id][_from] -= _amount;
        _balances[_id][_to] += _amount;
        emit TransferSingle(msg.sender, _from, _to, _id, _amount);
    }
    
    function burn(address _from, uint256 _id, uint256 _amount) public {
        require(_from == msg.sender || isApprovedForAll(_from, msg.sender), "ERC1155: no autorizado para quemar");
        require(_balances[_id][_from] >= _amount, "ERC1155: balance insuficiente para quemar");
        _balances[_id][_from] -= _amount;
        emit TransferSingle(msg.sender, _from, address(0), _id, _amount);
    }
    
    function _mint(address _to, uint256 _id, uint256 _amount) private {
        require(_to != address(0), "ERC1155: no se puede acunar a la direccion cero");
        _balances[_id][_to] += _amount;
        emit TransferSingle(msg.sender, address(0), _to, _id, _amount);
    }
}