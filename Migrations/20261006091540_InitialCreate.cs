using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Live_poll.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "polls",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    session_key = table.Column<string>(type: "TEXT", maxLength: 6, nullable: false),
                    question = table.Column<string>(type: "TEXT", nullable: false),
                    created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
                    closed_at = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_polls", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "options",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    poll_id = table.Column<int>(type: "INTEGER", nullable: false),
                    text = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_options", x => x.id);
                    table.ForeignKey(
                        name: "FK_options_polls_poll_id",
                        column: x => x.poll_id,
                        principalTable: "polls",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "participants",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    poll_id = table.Column<int>(type: "INTEGER", nullable: false),
                    nickname = table.Column<string>(type: "TEXT", nullable: false),
                    option_id = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_participants", x => x.id);
                    table.ForeignKey(
                        name: "FK_participants_options_option_id",
                        column: x => x.option_id,
                        principalTable: "options",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_participants_polls_poll_id",
                        column: x => x.poll_id,
                        principalTable: "polls",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_options_poll_id",
                table: "options",
                column: "poll_id");

            migrationBuilder.CreateIndex(
                name: "IX_participants_option_id",
                table: "participants",
                column: "option_id");

            migrationBuilder.CreateIndex(
                name: "IX_participants_poll_id_nickname",
                table: "participants",
                columns: new[] { "poll_id", "nickname" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_polls_session_key",
                table: "polls",
                column: "session_key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "participants");

            migrationBuilder.DropTable(
                name: "options");

            migrationBuilder.DropTable(
                name: "polls");
        }
    }
}
