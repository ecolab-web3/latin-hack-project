// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CSA_LatinHack
 * @author Equipo de desarrollo de E-co.lab
 * @notice Contrato prototipo para una Agricultura Sostenida por la Comunidad (CSA)
 * que utiliza NFTs (RWA) para representar las participaciones de los miembros.
 */
contract CSA_LatinHack {

    // --- Variables de Estado ---

    // Lógica de propiedad
    address public owner;

    // Estructuras de datos principales de ERC-1155
    // id del token => propietario => balance
    mapping(uint256 => mapping(address => uint256)) private _balances;
    // propietario => operador => aprobado (true/false)
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Datos específicos del negocio
    struct Season {
        string name;
        uint256 membershipPrice;
        uint256 totalMemberships;
        uint256 soldMemberships;
        uint256 startTime;
        uint256 endTime;
        bool isOpenForSale;
    }
    // El índice del array es ahora el ID del token para la temporada
    Season[] public seasons;

    // Mapeo para el canje semanal: miembro => id de temporada => número de semana => canjeado
    mapping(address => mapping(uint256 => mapping(uint256 => bool))) public weeklyRedemptions;

    // --- Eventos ---

    // Eventos estándar de ERC-1155
    event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _amount);
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);

    // Eventos personalizados del negocio
    event SeasonCreated(uint256 seasonId, string name, uint256 price, uint256 capacity);
    event MembershipPurchased(uint256 seasonId, address member, uint256 amount);
    event BoxRedeemed(uint256 seasonId, address member, uint256 weekNumber);

    // --- Modificadores ---

    modifier onlyOwner() {
        require(owner == msg.sender, "CSA: Quien llama no es el propietario");
        _;
    }

    // --- Constructor ---

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    // --- Lógica Principal del Negocio ---

    function createNewSeason(string memory seasonName, uint256 price, uint256 capacity, uint256 durationInWeeks) external onlyOwner {
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (durationInWeeks * 1 weeks);
        
        seasons.push(Season({
            name: seasonName,
            membershipPrice: price,
            totalMemberships: capacity,
            soldMemberships: 0,
            startTime: startTime,
            endTime: endTime,
            isOpenForSale: true
        }));
        
        uint256 seasonId = seasons.length - 1;
        emit SeasonCreated(seasonId, seasonName, price, capacity);
    }

    function closeSeasonSales(uint256 seasonId) external onlyOwner {
        require(seasonId < seasons.length, "CSA: ID de temporada invalido");
        seasons[seasonId].isOpenForSale = false;
    }

    function buyMembership() external payable {
        require(seasons.length > 0, "CSA: No hay temporadas creadas");
        uint256 seasonId = seasons.length - 1; // Compra siempre de la última temporada creada
                
        Season storage currentSeason = seasons[seasonId];

        require(currentSeason.isOpenForSale, "CSA: Las ventas estan cerradas");
        require(currentSeason.soldMemberships < currentSeason.totalMemberships, "CSA: Todas las participaciones vendidas");
        require(msg.value == currentSeason.membershipPrice, "CSA: Monto enviado incorrecto");

        currentSeason.soldMemberships++;
        
        // Acuña 1 token del tipo 'seasonId' para el comprador
        _mint(msg.sender, seasonId, 1);
        
        emit MembershipPurchased(seasonId, msg.sender, 1);
    }

    function redeemWeeklyBox(uint256 seasonId) external {
        // El usuario debe poseer al menos una participación de esta temporada
        require(balanceOf(msg.sender, seasonId) >= 1, "CSA: No eres miembro de esta temporada");
        
        Season storage season = seasons[seasonId];

        require(block.timestamp >= season.startTime && block.timestamp <= season.endTime, "CSA: Fuera del periodo de la temporada");

        uint256 currentWeek = (block.timestamp - season.startTime) / 1 weeks;

        // La lógica de canje ahora está vinculada a la dirección del miembro y al id de la temporada
        require(!weeklyRedemptions[msg.sender][seasonId][currentWeek], "CSA: La caja de esta semana ya fue canjeada");

        weeklyRedemptions[msg.sender][seasonId][currentWeek] = true;
        emit BoxRedeemed(seasonId, msg.sender, currentWeek);
    }
    
    function withdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "CSA: El retiro fallo");
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
        
        // NOTA: Se omite la llamada de verificación onERC1155Received para ahorrar bytecode.
    }

    function burn(address from, uint256 id, uint256 amount) public {
        require(from == msg.sender, "ERC1155: solo el propietario puede quemar");
        require(_balances[id][from] >= amount, "ERC1155: balance insuficiente para quemar");

        _balances[id][from] -= amount;
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }

    function _mint(address to, uint256 id, uint256 amount) internal {
        require(to != address(0), "ERC1155: no se puede acunar a la direccion cero");
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}