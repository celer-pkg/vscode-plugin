# VSCode plugin for Celer

1. 类似cmake plugin，在vscode底部呈现当前选择的：
  - platform, project, build_type
2. 支持celer支持的命令执行，以列表形式呈现，鼠标点击即操作，遇到有些命令需要二次选择的，弹出菜单，如：
  - init：询问conf repo地址，如果当前已经init过了则自动带入
  - clean: 弹出菜单询问project还是buildtrees里有目录的port的name@version
  - create: 询问create目标： platform? project? port?
  - install: 以列表呈现让用户选择哪个port以install
  - remove: 以列表呈现让用户选择哪个port以remove
  - reverse: 以列表呈现让用户选择需要reverse search哪个port
  - search: 以列表呈现让用户选择需要search的port
  - tree: 以列表呈现让用户选择查询哪个库的依赖
  - update: 以列表呈现让用户选择哪个port的源码需要更新