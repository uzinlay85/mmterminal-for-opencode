Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & WshShell.CurrentDirectory & "\scripts\launch.bat""", 0, False
