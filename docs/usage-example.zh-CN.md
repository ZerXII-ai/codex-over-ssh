# 使用范例：通过 Codex 执行远程任务

以下范例来自同一段 Codex 对话。截图经过裁剪和遮盖，主机名、对话时间及系统构建信息均已隐藏。`gaia-dev` 是截图中的连接名称；实际使用时，请替换为自己配置的连接名。

## 准备连接

按[中文安装与配置说明](../README.zh-CN.md#安装与配置)安装依赖并创建本机配置文件。下面仅展示密钥认证的配置结构，所有值都是占位符，使用前必须替换为自己的服务器信息：

```json
{
  "connections": {
    "gaia-dev": {
      "host": "192.0.2.10",
      "port": 22,
      "user": "your-ssh-user",
      "auth": {
        "type": "privateKey",
        "privateKeyPath": "/absolute/path/to/private-key"
      },
      "hostKey": "SHA256:REPLACE_WITH_VERIFIED_FINGERPRINT"
    }
  }
}
```

`192.0.2.10` 是文档示例地址，私钥路径需要填写绝对路径。请通过可信渠道核实服务器的主机指纹，并将 `hostKey` 替换为实际指纹或完整的 OpenSSH 主机公钥。配置文件为 `~/.config/gaia-ssh/connections.json`，应保持权限 `0600`；不要将真实配置或私钥提交到仓库。

在 Codex 中加载并启用插件后，可以先请求列出已配置的 Gaia SSH 连接。`gaia.list_connections` 的返回内容包含连接名、主机、端口、用户名、认证类型和主机身份，但不包含密码或私钥。分享输出或截图前，请遮盖不希望公开的连接信息。

## 范例一：查看远程系统信息

在 Codex 对话中输入：

```text
用 gaia-dev 跑一下 uname -a
```

对应的 `gaia.run_command` 参数示例：

```json
{
  "connection": "gaia-dev",
  "command": "uname -a"
}
```

下面的截图显示命令在该连接上执行成功，退出码为 `0`。主机名及部分系统构建信息已遮盖。

![脱敏截图：执行 uname -a](images/example-uname-redacted.png)

## 范例二：请求安装截图软件

也可以用自然语言提出远程任务：

```text
在 gaia-dev 安装一个截图软件
```

![脱敏截图：请求安装截图软件](images/example-install-redacted.png)

这张截图只显示用户请求，没有展示软件选择、实际执行的命令或安装结果。安装方式取决于目标系统和选定软件；应先确认安装方案和所需权限，再执行会改变远程环境的命令。

> `gaia.run_command` 可以执行任意 Shell 命令。请核对连接名与命令，并使用权限适当的远程账户。
