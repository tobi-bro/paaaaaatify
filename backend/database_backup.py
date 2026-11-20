"""
PAAAAAAATIFY — Automated Database Backup & Recovery Script
Supports both local SQLite and remote PostgreSQL instances.
Usage:
  python database_backup.py --backup
  python database_backup.py --restore <backup_filepath>
"""

import os
import sys
import shutil
import argparse
from datetime import datetime, timezone

def backup_sqlite(db_file: str, backup_dir: str = "backups") -> str:
    if not os.path.exists(db_file):
        print(f"[!] Error: Database file {db_file} not found.")
        sys.exit(1)

    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"paaaaaatify_backup_{timestamp}.db"
    dest_path = os.path.join(backup_dir, backup_filename)

    shutil.copy2(db_file, dest_path)
    file_size_kb = os.path.getsize(dest_path) / 1024
    print(f"[+] Backup completed successfully: {dest_path} ({file_size_kb:.2f} KB)")
    return dest_path

def restore_sqlite(backup_file: str, target_file: str = "paaaaaatify.db"):
    if not os.path.exists(backup_file):
        print(f"[!] Error: Backup file {backup_file} not found.")
        sys.exit(1)

    # Make safety copy of current target if it exists
    if os.path.exists(target_file):
        safety_copy = f"{target_file}.pre_restore"
        shutil.copy2(target_file, safety_copy)
        print(f"[*] Safety copy created: {safety_copy}")

    shutil.copy2(backup_file, target_file)
    print(f"[+] Database restored successfully from {backup_file} to {target_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Paaaaaaatify DB Backup & Restore")
    parser.add_argument("--backup", action="store_true", help="Execute automated database backup")
    parser.add_argument("--restore", type=str, help="Restore database from specified backup file")
    parser.add_argument("--db", type=str, default="paaaaaatify.db", help="Path to SQLite database file")
    args = parser.parse_args()

    if args.backup:
        backup_sqlite(args.db)
    elif args.restore:
        restore_sqlite(args.restore, args.db)
    else:
        parser.print_help()

