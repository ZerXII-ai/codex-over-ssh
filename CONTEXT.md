# Gaia Remote Execution

本上下文定义 Codex 通过 SSH 向 Gaia 提交命令并取得结果时使用的领域语言。

## Language

**Gaia**:
通过 SSH 接收命令并返回执行结果的远程服务器类别；系统可配置多个 Gaia 目标。
_Avoid_: 唯一服务器、远程机

**Authentication Method**:
Codex 连接 Gaia 时证明身份的方式；目前为 SSH 密钥认证或密码认证。

**Remote User**:
由用户提供、用于登录 Gaia 并承载 Command Run 的远程账户身份。
_Avoid_: Codex 用户、固定服务账户

**Gaia Connection**:
具名的、到一台 Gaia 目标的可复用连接配置，由主机地址、Remote User 和 Authentication Method 组成；一个 Command Run 选择恰好一个 Gaia Connection。

**Connection Name**:
唯一标识一个 Gaia Connection 的用户定义名称。每个 Command Run 必须显式提供一个 Connection Name。

**Host Identity**:
Gaia 目标用于证明其服务器身份的 SSH 主机公钥指纹；它必须与连接配置中预先确认的身份一致。

**Credential Configuration File**:
保存 Gaia Connection 凭据的本地 JSON 配置文件，固定位置为 `~/.config/gaia-ssh/connections.json`。

**Command Run**:
由 `gaia.run_command` 代表的一次在 Gaia 上执行命令的请求及其结果。
_Avoid_: 任务、作业

**Command**:
Command Run 在 Gaia 上交由 shell 执行的任意命令文本，不设命令白名单。

**Command Result**:
一次 Command Run 的结构化结果，包含状态、标准输出、标准错误与退出码；连接类失败没有退出码。默认每个输出流最多 8 KiB，且截断必须明确标识。

**Output Limit**:
Command Result 对每个输出流施加的最大返回大小。调用方可以提高该限制，但不得超过每流 64 KiB。

**SSH Transport Session**:
用于传输一个或多个 Command Run 的已认证 SSH 连接；它可被同一 Gaia Connection 短期复用，但不共享 Command Run 的 shell 状态。

## Example dialogue

开发者：请对 Gaia 发起一次 Command Run。  
领域专家：可以；指定 Connection Name 选择 Gaia Connection 并验证其 Host Identity 后，`gaia.run_command` 会在 Gaia 的 Remote User 身份下执行 Command 并返回该次 Command Result；其凭据由 Credential Configuration File 提供。  
开发者：两次 Command Run 会不会共享 `cd` 的结果？  
领域专家：不会。它们可以复用 SSH Transport Session，但每次 Command Run 都有独立 shell 状态。
