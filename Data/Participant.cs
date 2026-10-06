namespace Live_poll.Data;

public class Participant
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public int? OptionId { get; set; }

    public Poll Poll { get; set; } = null!;
    public PollOption? Option { get; set; }
}
