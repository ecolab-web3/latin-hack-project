import { useChainId, useSwitchChain } from 'wagmi'

export function SwitchChain() {
  const chainId = useChainId()
  const { chains, switchChain, error } = useSwitchChain()

  const getCurrentChainName = () => {
    const currentChain = chains.find(chain => chain.id === chainId)
    return currentChain ? currentChain.name : `Unknown (${chainId})`
  }

  return (
    <div data-testid="switch-chain">
      <h2>Switch Network</h2>
      <h3>Current: {getCurrentChainName()}</h3>
      <p>Available Asset Hub Networks:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {chains.map((chain) => (
          <button
            disabled={chainId === chain.id}
            key={chain.id}
            onClick={() => switchChain({ chainId: chain.id })}
            type="button"
            className="card"
            style={{
              opacity: chainId === chain.id ? 0.6 : 1,
              backgroundColor: chainId === chain.id ? '#4CAF50' : '#2196F3'
            }}
          >
            <strong>{chain.name}</strong>
            <br />
            <small>ID: {chain.id}</small>
            <br />
            <small>{chain.nativeCurrency.symbol}</small>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}
    </div>
  )
}